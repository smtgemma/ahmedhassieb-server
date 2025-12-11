// SubscriptionPayment.service: Module file for the SubscriptionPayment.service functionality.
import { Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import { paginationHelper } from "../../../helpars/paginationHelper";
import prisma from "../../../shared/prisma";
import stripe from "../../../shared/stripe";
import { StripeService } from "../Stripe/Stripe.service";
import httpStatus from "http-status";
import { subscriptionPaymentSearchAbleFields } from "./SubscriptionPayment.constant";
import emailSender from "../../../shared/emailSernder";

const createSubscriptionPayment = async (payload: any, userId: string) => {
  // -------------------------------
  // 1. VALIDATE USER & PLAN
  // -------------------------------
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: payload.planId },
  });

  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");

  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  // -------------------------------
  // 2. CALCULATE TOTAL AVAILABLE TOKENS
  // -------------------------------
  const totalTokensData = await prisma.userPackage.aggregate({
    _sum: { tokens: true },
    where: { userId },
  });

  const totalTokens = totalTokensData._sum.tokens || 0;

  // -------------------------------
  // 3. TOKEN DISCOUNT LOGIC
  // -------------------------------
  const price = plan.price;
  const discount = Math.min(totalTokens, price); // $1 per token
  const finalPrice = price - discount;

  console.log(
    `Tokens Used: ${discount}, Final First Month Price: ${finalPrice}`
  );

  // -------------------------------
  // 4. ATTACH PAYMENT METHOD TO CUSTOMER
  // -------------------------------
  await StripeService.attachPaymentMethodToCustomer(
    payload.paymentMethodId,
    user.stripeCustomerId!
  );

  // -------------------------------
  // 5. CREATE STRIPE SUBSCRIPTION (WITH DISCOUNTED FIRST PAYMENT)
  // -------------------------------
  const stripeSubscription =
    await StripeService.createStripeSubscriptionWithDiscount({
      customerId: user.stripeCustomerId!,
      priceId: plan.stripePriceId,
      paymentMethodId: payload.paymentMethodId,
      firstPaymentAmount: finalPrice * 100, // Stripe requires cents
      userId,
      planId: plan.id,
      planName: plan.name,
    });

  if (!stripeSubscription)
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create Stripe subscription"
    );

  // -------------------------------
  // 6. DEDUCT USED TOKENS FROM USERPACKAGES (FIFO)
  // -------------------------------
  let remainingTokensToDeduct = discount;

  if (remainingTokensToDeduct > 0) {
    const packages = await prisma.userPackage.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" }, // oldest first
    });

    for (const pkg of packages) {
      if (remainingTokensToDeduct <= 0) break;

      const deduct = Math.min(pkg.tokens, remainingTokensToDeduct);

      await prisma.userPackage.update({
        where: { id: pkg.id },
        data: { tokens: pkg.tokens - deduct },
      });

      remainingTokensToDeduct -= deduct;
    }
  }

  // -------------------------------
  // 7. CREATE BUSINESS PACKAGE ENTRY
  // -------------------------------
  const userPackage = await prisma.userPackage.create({
    data: {
      userId,
      planId: plan.id,
      stripeSubscriptionId: stripeSubscription.id,
      status: "ACTIVE",

      startDate: new Date(),
      paidMonths: 1,
      remainingMonths: 11,

      nextBillingDate: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      payoutAmount: 0,
      tokens: 0, // new package starts with zero tokens
    },
  });

  // -------------------------------
  // 8. CREATE DEAL ROW (PER PACKAGE)
  // -------------------------------
  await prisma.deal.create({
    data: {
      userPackageId: userPackage.id,
      planId: plan.id,
    },
  });

  // -------------------------------
  // 9. CREATE SUBSCRIPTION PAYMENT RECORD
  // -------------------------------
  const subscriptionPayment = await prisma.subscriptionPayment.create({
    data: {
      amount: finalPrice,
      paymentMethodId: payload.paymentMethodId,
      paymentStatus: "COMPLETED",
      subscriptionId: stripeSubscription.id,

      userId,
      planId: plan.id,
      stripePriceId: plan.stripePriceId,
      stripeProductId: plan.stripeProductId,
    },
  });

  // -------------------------------
  // 10. CREATE BILLING LOG ENTRY (MONTH 1, DISCOUNTED)
  // -------------------------------
  await prisma.billingLog.create({
    data: {
      userPackageId: userPackage.id,
      amount: finalPrice, // discounted amount
      monthNumber: 1,
      status: "SUCCESS",
    },
  });

  //send email
  const subject =  "Payment Successful – Subscription Activated"
      const body = `
Hi ${user.name},

🎉 Your subscription has been successfully activated!

You can now access your package and start using the platform.

Best regards,  
M2X Team
`
await emailSender(subject, user.email, body);

  return {
    message: "Subscription successful",
    tokensApplied: discount,
    finalPrice,
    subscriptionPayment,
    userPackage,
  };
};

//cancel stripe subscription
const cancelStripeSubscription = async (
  stripeSubId: string,
  userId: string
) => {
  // Step 1: Fetch DB record
  const dbPayment = await prisma.subscriptionPayment.findFirst({
    where: {
      userId,
      subscriptionId: stripeSubId,
      paymentStatus: "COMPLETED",
    },
  });

  if (!dbPayment) {
    throw new Error("Subscription payment not found or already canceled");
  }

  let stripeSubscription;
  try {
    // Step 2: Cancel subscription at period end in Stripe
    stripeSubscription = await stripe.subscriptions.update(stripeSubId, {
      cancel_at_period_end: true,
      metadata: { userId },
    });

    // Step 3: Update DB
    const updatedPayment = await prisma.subscriptionPayment.update({
      where: { id: dbPayment.id },
      data: {
        canceledAt: new Date(),
        cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end,
        endDate: stripeSubscription.cancel_at
          ? new Date(stripeSubscription.cancel_at * 1000)
          : null,
      },
    });

    if (!updatedPayment) {
      throw new Error("Failed to update subscription payment");
    }

    return {
      success: true,
      message: "Subscription will cancel at period end",
      data: updatedPayment,
    };
  } catch (dbError: any) {
    console.error("DB update failed, rolling back Stripe operation:", dbError);

    // Step 4: Rollback Stripe if possible
    try {
      await stripe.subscriptions.update(stripeSubId, {
        cancel_at_period_end: false, // revert cancellation
        metadata: { userId },
      });
    } catch (rollbackError) {
      console.error("Failed to rollback Stripe subscription:", rollbackError);
      // Optional: alert admin, log for manual intervention
    }

    throw new Error(
      dbError.message || "Failed to cancel subscription, rollback attempted"
    );
  }
};

//change subscription plan
const changeSubscriptionPlan = async (userId: string, newPlanId: string) => {
  // 1️⃣ Fetch current active subscription payment
  const currentPayment = await prisma.subscriptionPayment.findFirst({
    where: { userId, paymentStatus: "COMPLETED" },
  });

  if (!currentPayment) {
    throw new ApiError(httpStatus.NOT_FOUND, "Active subscription not found");
  }

  // 2️⃣ Fetch new plan details
  const newPlan = await prisma.subscriptionPlan.findUnique({
    where: { id: newPlanId },
  });

  if (!newPlan) {
    throw new ApiError(httpStatus.NOT_FOUND, "New subscription plan not found");
  }

  // 3️⃣ Wrap everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 3a. Retrieve Stripe subscription to get subscription item ID
    const stripeSub = await stripe.subscriptions.retrieve(
      currentPayment.subscriptionId
    );

    if (!stripeSub.items.data.length) {
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "No subscription items found in Stripe"
      );
    }

    const subscriptionItemId = stripeSub.items.data[0].id; // ⚠️ Must use subscription item ID

    // 3b. Update Stripe subscription with new plan
    const updatedStripeSub = await stripe.subscriptions.update(
      currentPayment.subscriptionId,
      {
        items: [
          {
            id: subscriptionItemId,
            price: newPlan.stripePriceId,
          },
        ],
        proration_behavior: "create_prorations", // mid-cycle adjustments
      }
    );

    // 3c. Update DB subscription payment
    const updatedPayment = await tx.subscriptionPayment.update({
      where: { id: currentPayment.id },
      data: {
        previousPlanId: currentPayment.planId,
        planId: newPlan.id,
        amount: newPlan.price,
        stripePriceId: newPlan.stripePriceId,
        stripeProductId: newPlan.stripeProductId,
      },
    });

    return {
      stripeSubscription: updatedStripeSub,
      updatedPayment,
    };
  });

  return result;
};

//add new payment method
const addNewPaymentMethod = async (userId: string, paymentMethodId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }
  if (!user.stripeCustomerId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Stripe customer not found");
  }
  const result = await StripeService.attachPaymentMethodToCustomer(
    paymentMethodId,
    user.stripeCustomerId
  );

  return result;
};

//set default payment method
const setDefaultPaymentMethod = async (
  userId: string,
  paymentMethodId: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.stripeCustomerId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Stripe customer not found");
  }

  const result = await StripeService.setDefaultPaymentMethod(
    user.stripeCustomerId,
    paymentMethodId
  );

  return result;
};

//get all payment methods
const getAllPaymentMethods = async (userId: string) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  if (!user.stripeCustomerId) {
    throw new ApiError(httpStatus.NOT_FOUND, "Stripe customer not found");
  }

  const result = await StripeService.getAllPaymentMethods(
    user.stripeCustomerId
  );

  return result;
};

// Get all payments
const getAllPayments = async (params: any, options: any) => {
  const { page, limit, skip } = paginationHelper.calculatePagination(options);
  const { searchTerm, ...filterData } = params;

  const andConditions: Prisma.SubscriptionPaymentWhereInput[] = [];

  if (params.searchTerm) {
    andConditions.push({
      OR: subscriptionPaymentSearchAbleFields.map((field) => ({
        [field]: {
          contains: params.searchTerm,
          mode: "insensitive",
        },
      })),
    });
  }

  if (Object.keys(filterData).length > 0) {
    andConditions.push({
      AND: Object.keys(filterData).map((key) => ({
        [key]: {
          equals: filterData[key],
        },
      })),
    });
  }
  const whereConditions: Prisma.SubscriptionPaymentWhereInput = {
    AND: andConditions,
  };

  const result = await prisma.subscriptionPayment.findMany({
    where: whereConditions,
    include: {
      user: true,
      plan: true,
    },
    skip,
    orderBy:
      options.sortBy && options.sortOrder
        ? {
            [options.sortBy]: options.sortOrder,
          }
        : {
            createdAt: "desc",
          },
    take: limit,
  });
  const total = await prisma.subscriptionPayment.count({
    where: whereConditions,
  });

  return {
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    data: result,
  };
};

// Get single payment
const getSinglePayment = async (paymentId: string) => {
  const payment = await prisma.subscriptionPayment.findUnique({
    where: {
      id: paymentId,
    },
    include: {
      user: true,
      plan: true,
    },
  });
  return payment;
};

//get payment by user id
const getPaymentByUserId = async (userId: string) => {
  const payment = await prisma.subscriptionPayment.findMany({
    where: {
      userId,
    },
    include: {
      user: true,
      plan: true,
    },
  });
  return payment;
};

// Update payment
const updatePayment = async (paymentId: string, payload: any) => {
  const payment = await prisma.subscriptionPayment.update({
    where: {
      id: paymentId,
    },
    data: {
      ...payload,
    },
  });
  return payment;
};

// Delete payment
const deletePayment = async (paymentId: string) => {
  const payment = await prisma.subscriptionPayment.delete({
    where: {
      id: paymentId,
    },
  });
  return payment;
};

export const SubscriptionPaymentService = {
  createSubscriptionPayment,
  cancelStripeSubscription,
  changeSubscriptionPlan,
  addNewPaymentMethod,
  setDefaultPaymentMethod,
  getAllPaymentMethods,
  getAllPayments,
  getSinglePayment,
  updatePayment,
  deletePayment,
  getPaymentByUserId,
};

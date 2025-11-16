// SubscriptionPayment.service: Module file for the SubscriptionPayment.service functionality.
import { Prisma } from "@prisma/client";
import ApiError from "../../../errors/ApiErrors";
import { paginationHelper } from "../../../helpars/paginationHelper";
import prisma from "../../../shared/prisma";
import stripe from "../../../shared/stripe";
import { StripeService } from "../Stripe/Stripe.service";
import httpStatus from "http-status";
import { subscriptionPaymentSearchAbleFields } from "./SubscriptionPayment.constant";

const createSubscriptionPayment = async (payload: any, userId: string) => {
  const isPlanExist = await prisma.subscriptionPlan.findUnique({
    where: {
      id: payload.planId,
    },
  });

  if (!isPlanExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  const isUserExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // Attach payment method to customer
  await StripeService.attachPaymentMethodToCustomer(
    payload.paymentMethodId,
    isUserExist.stripeCustomerId!
  );

  // Create Stripe subscription
  const subscription = await StripeService.createStripeSubscription(
    isUserExist.stripeCustomerId!,
    isPlanExist.stripePriceId,
    userId,
    isPlanExist.id,
    isPlanExist.name,
    isPlanExist.price,
    payload.paymentMethodId
  );

  if (!subscription) {
    throw new ApiError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create Stripe subscription"
    );
  }

  const subscriptionPayment = await prisma.subscriptionPayment.create({
    data: {
      amount: isPlanExist.price,
      paymentMethodId: payload.paymentMethodId,
      paymentStatus: "COMPLETED",
      subscriptionId: subscription.id,
      userId,
      planId: isPlanExist.id,
      stripePriceId: isPlanExist.stripePriceId,
      stripeProductId: isPlanExist.stripeProductId,
    },
  });

  return subscriptionPayment;
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

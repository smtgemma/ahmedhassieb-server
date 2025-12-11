import ApiError from "../../../errors/ApiErrors";
import emailSender from "../../../shared/emailSernder";
import prisma from "../../../shared/prisma";
import httpStatus from "http-status";
import stripe from "../../../shared/stripe";
import { differenceInDays } from "date-fns";
import Stripe from "stripe";

// Deal.service: Module file for the Deal.service functionality.
const addNewDeal = async (userId: string, planId: string, dealId: string) => {
  // check plan exists
  // const isPlanExist = await prisma.subscriptionPlan.findUnique({
  //   where: { id: planId },
  // });
  // if (!isPlanExist) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  // }
  // // check user exists
  // const isUserExist = await prisma.user.findUnique({
  //   where: { id: userId },
  // });
  // if (!isUserExist) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  // }
  // // get deal
  // const deal = await prisma.deal.findUnique({
  //   where: { id: dealId },
  // });
  // if (!deal) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  // }
  // // planId is stored as array of strings
  // const alreadyAdded = deal.planId.includes(planId);
  // if (alreadyAdded) {
  //   throw new ApiError(
  //     httpStatus.BAD_REQUEST,
  //     "Plan already added to this deal"
  //   );
  // }
  // // update deal with new planId
  // const result = await prisma.deal.update({
  //   where: { id: dealId },
  //   data: {
  //     planId: {
  //       push: planId, // best approach for String[] fields
  //     },
  //   },
  // });
  // return result;
};

const getDealByUserId = async (userId: string) => {
  // const deal = await prisma.deal.findFirst({
  //   where: {
  //     userId: userId,
  //   },
  // });
  // if (!deal) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  // }
  // // Fetch all plans for the deal
  // const plans = await prisma.subscriptionPlan.findMany({
  //   where: {
  //     id: {
  //       in: deal.planId, // array lookup
  //     },
  //   },
  // });
  // return {
  //   ...deal,
  //   plans, // add full plan objects
  // };
};

// update deal
const updateDeal = async (payload: any) => {
  // const deal = await prisma.deal.findFirst({
  //   where: {
  //     userId: payload.userId,
  //   },
  // });
  // if (!deal) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  // }
  // const result = await prisma.deal.update({
  //   where: {
  //     id: payload.dealId,
  //   },
  //   data: {
  //     activeDeals: payload.activeDeals || deal.activeDeals,
  //     completedDeals: payload.completedDeals || deal.completedDeals,
  //     payoutAmount: payload.payoutAmount || deal.payoutAmount,
  //     payoutDate: payload.payoutDate || deal.payoutDate,
  //     tokens: payload.tokens || deal.tokens,
  //   },
  // });
  // return result;
};

const resetDeal = async (dealId: string) => {
  // const isDealExist = await prisma.deal.findUnique({
  //   where: {
  //     id: dealId,
  //   },
  // });
  // if (!isDealExist) {
  //   throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  // }
  // const result = await prisma.deal.update({
  //   where: {
  //     id: dealId,
  //   },
  //   data: {
  //     activeDeals: 0,
  //     completedDeals: 0,
  //     payoutAmount: 0,
  //     tokens: 0,
  //     payoutDate: null,
  //     planId: [],
  //   },
  // });
  // return result;
};

const sendEmailToUser = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  await emailSender("Deal ", result.email, "test mail");
};

const getUserDashboard = async (userId: string) => {
  // Fetch all UserPackages for this user
  const userPackages = await prisma.userPackage.findMany({
    where: { userId },
    include: {
      plan: true,
      deals: true,
    },
  });

  if (!userPackages || userPackages.length === 0) {
    return { packages: [] };
  }

  // Format response
  const result = userPackages.map((pkg) => {
    const deal = pkg.deals[0] || {
      activeDeals: 0,
      completedDeals: 0,
      tokens: 0,
      payoutAmount: 0,
      payoutDate: null,
    };

    return {
      packageDetails: {
        userPackageId: pkg.id,
        packageName: pkg.plan.name,
        status: pkg.status,
        startDate: pkg.startDate,
        nextBillingDate: pkg.nextBillingDate,
        paidMonths: pkg.paidMonths,
        remainingMonths: pkg.remainingMonths,
        planPrice: pkg.plan.price,
        planMonthlyPrice: pkg.plan.price / 12,
      },

      dashboard: {
        activeDeals: deal.activeDeals,
        completedDeals: deal.completedDeals,
        tokens: deal.tokens,
        payoutAmount: deal.payoutAmount,
        payoutDate: deal.payoutDate,
      },
    };
  });

  return { packages: result };
};

// update dashboard
const updateDashboard = async (userPackageId: string, payload: any) => {
  // 1. Fetch the package
  const userPackage = await prisma.userPackage.findUnique({
    where: { id: userPackageId },
    include: { deals: true },
  });

  if (!userPackage) {
    throw new ApiError(httpStatus.NOT_FOUND, "Package not found");
  }

  // 2. Find or create the Deal row
  let deal = userPackage.deals[0];

  if (!deal) {
    deal = await prisma.deal.create({
      data: {
        userPackageId,
        planId: userPackage.planId,
      },
    });
  }

  // 3. Build update objects
  const dealUpdateData: any = {};
  const packageUpdateData: any = {};

  if (payload.activeDeals !== undefined) {
    dealUpdateData.activeDeals = payload.activeDeals;
  }

  if (payload.completedDeals !== undefined) {
    dealUpdateData.completedDeals = payload.completedDeals;
  }

  if (payload.tokens !== undefined) {
    dealUpdateData.tokens = payload.tokens;
  }

  if (payload.payoutAmount !== undefined) {
    dealUpdateData.payoutAmount = payload.payoutAmount;
  }

  if (payload.payoutDate !== undefined) {
    dealUpdateData.payoutDate = payload.payoutDate
      ? new Date(payload.payoutDate)
      : null;
  }

  // Package-level values
  if (payload.status !== undefined) {
    packageUpdateData.status = payload.status;
  }

  if (payload.remainingMonths !== undefined) {
    packageUpdateData.remainingMonths = payload.remainingMonths;
  }

  if (payload.paidMonths !== undefined) {
    packageUpdateData.paidMonths = payload.paidMonths;
  }

  if (payload.nextBillingDate !== undefined) {
    packageUpdateData.nextBillingDate = new Date(payload.nextBillingDate);
  }

  // 4. Update inside a transaction
  const [updatedDeal, updatedPackage] = await prisma.$transaction([
    prisma.deal.update({
      where: { id: deal.id },
      data: dealUpdateData,
    }),

    prisma.userPackage.update({
      where: { id: userPackageId },
      data: packageUpdateData,
    }),
  ]);

  return {
    message: "Dashboard updated successfully",
    deal: updatedDeal,
    package: updatedPackage,
  };
};

// assignPackageToUser
const assignPackageToUser = async (
  userId: string,
  planId: string,
  startDate?: string
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) throw new ApiError(httpStatus.NOT_FOUND, "User not found");

  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!plan) throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");

  // CREATE UserPackage WITHOUT BILLING
  const userPackage = await prisma.userPackage.create({
    data: {
      userId,
      planId: plan.id,
      status: "ACTIVE",
      startDate: startDate ? new Date(startDate) : new Date(),

      paidMonths: 0,
      remainingMonths: 12,

      tokens: 0,
      payoutAmount: 0,
      refundStopped: false,
      billingStopped: true, // *************** NO BILLING ***************
    },
  });

  // Create Deal for dashboard
  await prisma.deal.create({
    data: {
      userPackageId: userPackage.id,
      planId: plan.id,
    },
  });

  return {
    message: "Package assigned successfully (no billing)",
    userPackage,
  };
};

// removePackageFromUser
const removePackageFromUser = async (userPackageId: string) => {
  const userPackage = await prisma.userPackage.findUnique({
    where: { id: userPackageId },
    include: { deals: true },
  });

  if (!userPackage) {
    throw new ApiError(httpStatus.NOT_FOUND, "Package not found");
  }

  // Reset dashboard data & stop cycles
  const updated = await prisma.userPackage.update({
    where: { id: userPackageId },
    data: {
      status: "REMOVED",
      refundStopped: true,
      billingStopped: true,
      tokens: 0,
      payoutAmount: 0,
      paidMonths: 0,
      remainingMonths: 12,
      nextBillingDate: null,
    },
  });

  // Reset deal (if exists)
  if (userPackage.deals.length > 0) {
    await prisma.deal.update({
      where: { id: userPackage.deals[0].id },
      data: {
        activeDeals: 0,
        completedDeals: 0,
        tokens: 0,
        payoutAmount: 0,
        payoutDate: null,
      },
    });
  }

  return {
    message: "Package removed successfully",
    updated,
  };
};

// 1. CALCULATE REMAINING PAYMENT DETAILS
const calculateRemaining = async (userPackageId: string, userId: string) => {
  const pkg = await prisma.userPackage.findUnique({
    where: { id: userPackageId },
    include: { plan: true },
  });

  if (!pkg) throw new ApiError(httpStatus.NOT_FOUND, "Package not found");
  if (pkg.userId !== userId)
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");

  const monthlyPrice = pkg.plan.price / 12;
  const remainingAmount = monthlyPrice * pkg.remainingMonths;

  const tokens = pkg.tokens;
  const discount = Math.min(tokens, remainingAmount);
  const finalAmount = remainingAmount - discount;

  return {
    paidMonths: pkg.paidMonths,
    remainingMonths: pkg.remainingMonths,
    monthlyPrice,
    tokensAvailable: tokens,
    remainingAmount,
    discount,
    finalAmount,
    canWithdraw: finalAmount <= 0,
  };
};

// 2. CREATE REMAINING PAYMENT INVOICE
const createRemainingPaymentInvoice = async (
  userPackageId: string,
  userId: string
) => {
  const pkg = await prisma.userPackage.findUnique({
    where: { id: userPackageId },
    include: { plan: true, user: true },
  });

  if (!pkg) throw new ApiError(httpStatus.NOT_FOUND, "Package not found");
  if (pkg.userId !== userId)
    throw new ApiError(httpStatus.FORBIDDEN, "Unauthorized");

  const monthlyPrice = pkg.plan.price;
  const remainingAmount = monthlyPrice * pkg.remainingMonths;

  const tokens = pkg.tokens;
  const discount = Math.min(tokens, remainingAmount);
  const finalAmount = remainingAmount - discount;

  if (remainingAmount <= 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, "No remaining amount to pay");
  }

  // 🔎 1. Retrieve Stripe customer and default payment method
  const customer = (await stripe.customers.retrieve(
    pkg.user.stripeCustomerId!
  )) as Stripe.Customer;
  const defaultPaymentMethod =
    customer.invoice_settings?.default_payment_method;

  if (!defaultPaymentMethod) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "No saved card found. Please add a payment method."
    );
  }

  // 🧮 2. Deduct tokens immediately
  await prisma.userPackage.update({
    where: { id: pkg.id },
    data: {
      tokens: pkg.tokens - discount,
    },
  });

  // ⚡ 3. Instant payment (PaymentIntent)
  const paymentIntent = await stripe.paymentIntents.create({
    customer: pkg.user.stripeCustomerId!,
    payment_method:
      typeof defaultPaymentMethod === "string"
        ? defaultPaymentMethod
        : defaultPaymentMethod?.id,
    amount: Math.round(finalAmount * 100),
    currency: "usd",
    description: "Remaining balance before payout",
    off_session: true,
    confirm: true,
    automatic_payment_methods: { enabled: true },
    metadata: {
      userPackageId,
      reason: "remaining_payment",
      tokensUsed: discount,
    },
  });

  // 📌 4. Update package if payment successful
  if (paymentIntent.status === "succeeded") {
    await prisma.userPackage.update({
      where: { id: pkg.id },
      data: {
        paidMonths: 12,
        remainingMonths: 0,
        billingStopped: true,
        refundStopped: true,
        status: "PAYOUT_PENDING",
      },
    });
  }

  return {
    message: "Payment completed instantly.",
    paymentIntentId: paymentIntent.id,
    paymentStatus: paymentIntent.status,
    finalAmount,
    tokensUsed: discount,
    remainingAmount,
  };
};

//!
const createCryptoWithdrawRequest = async (
  userPackageId: string,
  userId: string,
  payload: any
) => {
  const { stablecoin, network, walletAddress, confirmWalletAddress, agreed } =
    payload;

  // 1. Validate required fields
  if (!stablecoin) throw new ApiError(400, "Stablecoin is required");
  if (!network) throw new ApiError(400, "Network is required");
  if (!walletAddress) throw new ApiError(400, "Wallet address is required");
  if (walletAddress !== confirmWalletAddress)
    throw new ApiError(400, "Wallet addresses do not match");
  if (!agreed) throw new ApiError(400, "You must confirm the wallet address");

  // 2. Fetch the package
  const pkg = await prisma.userPackage.findUnique({
    where: { id: userPackageId },
    include: { payoutRequests: true },
  });

  if (!pkg) throw new ApiError(404, "Package not found");
  if (pkg.userId !== userId) throw new ApiError(403, "Unauthorized");

  // Must have completed all months
  if (pkg.remainingMonths > 0) {
    throw new ApiError(400, "You must complete all monthly payments first");
  }

  // Must be payout eligible
  if (pkg.status !== "PAYOUT_PENDING") {
    throw new ApiError(400, "This package is not eligible for payout");
  }

  // Prevent multiple payout requests
  const existing = pkg.payoutRequests.find((r) => !r.processedAt);
  if (existing) throw new ApiError(400, "Payout request already submitted");

  // 3. Build extraInfo object
  const extraInfo = {
    stablecoin,
    network,
  };

  // 4. Create the payout request
  const payout = await prisma.payoutRequest.create({
    data: {
      userPackageId,
      walletAddress,
      extraInfo: JSON.stringify(extraInfo),
      approved: false,
    },
  });

  // 5. Keep status as PAYOUT_PENDING
  await prisma.userPackage.update({
    where: { id: userPackageId },
    data: {
      status: "PAYOUT_PENDING",
    },
  });

  return {
    message: "Crypto payout request submitted successfully",
    payout,
  };
};

export const runRefundCronJob = async () => {
  console.log("🔄 Running Updated Refund Cron Job...");

  try {
    const packages = await prisma.userPackage.findMany({
      where: {
        status: "ACTIVE",
        refundStopped: false,
      },
      include: {
        plan: true,
        refunds: true,
      },
    });

    if (!packages.length) {
      console.log("ℹ️ No eligible packages found for refund.");
      return;
    }

    // Updated refund percentages
    const milestones = [
      { day: 90, enum: "DAY_90", percent: 15 },
      { day: 180, enum: "DAY_180", percent: 20 },
      { day: 270, enum: "DAY_270", percent: 15 },
      { day: 360, enum: "DAY_360", percent: 50 },
    ];

    for (const pkg of packages) {
      const daysPassed = differenceInDays(new Date(), new Date(pkg.startDate));

      for (const ms of milestones) {
        if (daysPassed >= ms.day) {
          const alreadyRefunded = pkg.refunds.some(
            (r) => r.milestone === ms.enum
          );

          if (alreadyRefunded) continue;

          const tokenAmount = (pkg.plan.price * ms.percent) / 100;

          // Create refund log
          await prisma.refundLog.create({
            data: {
              userPackageId: pkg.id,
              milestone: ms.enum as any,
              percent: ms.percent,
              amount: tokenAmount,
            },
          });

          // Update only tokens
          await prisma.userPackage.update({
            where: { id: pkg.id },
            data: {
              tokens: pkg.tokens + tokenAmount,
            },
          });

          console.log(
            `✅ Refund applied for package ${pkg.id} → ${ms.enum}: +${tokenAmount} tokens`
          );
        }
      }
    }

    console.log("🎉 Updated Refund Cron Completed.");
  } catch (error) {
    console.error("❌ Updated Refund Cron Error:", error);
  }
};

const adminApprovePayout = async (payoutRequestId: string) => {
  // 1. Fetch payout request
  const payout = await prisma.payoutRequest.findUnique({
    where: { id: payoutRequestId },
    include: {
      userPackage: {
        include: {
          deals: true,
        },
      },
    },
  });

  if (!payout) {
    throw new ApiError(httpStatus.NOT_FOUND, "Payout request not found");
  }

  if (payout.approved) {
    throw new ApiError(httpStatus.BAD_REQUEST, "Payout already approved");
  }

  const pkg = payout.userPackage;
  const deal = pkg.deals[0]; // each package has 1 deal

  // 2. Approve payout request
  const updatedRequest = await prisma.payoutRequest.update({
    where: { id: payoutRequestId },
    data: {
      approved: true,
      processedAt: new Date(),
    },
  });

  // 3. Reset & Lock package after payout
  const updatedPackage = await prisma.userPackage.update({
    where: { id: pkg.id },
    data: {
      status: "PAYOUT_COMPLETED",
      tokens: 0,
      payoutAmount: 0,
      refundStopped: true,
      billingStopped: true,
      remainingMonths: 0,
      paidMonths: pkg.paidMonths, // keep old value
    },
  });

  // 4. Reset deal metrics
  if (deal) {
    await prisma.deal.update({
      where: { id: deal.id },
      data: {
        activeDeals: 0,
        completedDeals: 0,
        tokens: 0,
        payoutAmount: 0,
        payoutDate: new Date(),
      },
    });
  }

  return {
    message: "Payout approved successfully",
    payoutRequest: updatedRequest,
    userPackage: updatedPackage,
  };
};

// Exporting the Deal.service module.
export const DealService = {
  addNewDeal,
  getDealByUserId,
  updateDeal,
  resetDeal,
  sendEmailToUser,
  getUserDashboard,
  updateDashboard,
  assignPackageToUser,
  removePackageFromUser,
  createRemainingPaymentInvoice,
  createCryptoWithdrawRequest,
  adminApprovePayout,
};

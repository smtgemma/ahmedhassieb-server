// SubscriptionPlan.service: Module file for the SubscriptionPlan.service functionality.
import prisma from "../../../shared/prisma";
import ApiError from "../../../errors/ApiErrors";
import httpStatus from "http-status";
import { ISubscriptionPlan } from "./SubscriptionPlan.interface";
import { StripeService } from "../Stripe/Stripe.service";
import Stripe from "stripe";
import stripe from "../../../shared/stripe";

//create subscription
// create subscription plan
const createSubscriptionPlan = async (data: any) => {
  const normalizedName = data.name.toUpperCase();
  let product: Stripe.Product | null = null;
  let createdPrice: Stripe.Price | null = null;

  try {
    // 1. Create Stripe product
    product = await StripeService.createStripeProduct(normalizedName);

    // 2. Create Stripe price
    createdPrice = await StripeService.createStripeProductPrice(
      data.price,
      product.id,
      data.interval
    );

    // 3. Save in DB (transaction safe)
    const result = await prisma.subscriptionPlan.create({
      data: {
        name: normalizedName,
        stripePriceId: createdPrice.id,
        stripeProductId: product.id,
        price: data.price,
        payoutRange: data.payoutRange,
        currency: data.currency,
        interval: data.interval,
        features: data.features,
      },
    });

    return result;
  } catch (error: any) {
    console.error("Subscription creation failed:", error);

    // 🔥 rollback Stripe objects if DB failed
    if (createdPrice) {
      try {
        await stripe.prices.update(createdPrice.id, { active: false });
      } catch (e) {
        console.warn("Failed to rollback Stripe price:", e);
      }
    }
    if (product) {
      try {
        await stripe.products.update(product.id, { active: false });
      } catch (e) {
        console.warn("Failed to rollback Stripe product:", e);
      }
    }

    // throw proper error
    if (error.code === "P2002") {
      throw new ApiError(409, "Subscription already exists for this plan");
    }
    throw new ApiError(500, error.message);
  }
};

//get my subscription
const getMySubscriptionPlan = async (userId: string) => {
  const subscription = await prisma.subscriptionPayment.findFirst({
    where: {
      userId,
      paymentStatus: "COMPLETED",
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      plan: true,
    },
  });

  if (!subscription) {
    return { message: "No active subscription found" };
  }

  // Calculate expiry
  const createdAt = subscription.createdAt;
  let expiryDate = new Date(createdAt);

  switch (subscription.plan.interval) {
    case "month":
      expiryDate.setMonth(expiryDate.getMonth() + 1);
      break;
    case "year":
      expiryDate.setFullYear(expiryDate.getFullYear() + 1);
      break;
    case "week":
      expiryDate.setDate(expiryDate.getDate() + 7);
      break;
    case "day":
      expiryDate.setDate(expiryDate.getDate() + 1);
      break;
  }

  if (expiryDate < new Date()) {
    return { message: "No active subscription found" };
  }

  return subscription;
};

//get all subscription
const getAllSubscriptionPlans = async () => {
  return prisma.subscriptionPlan.findMany({});
};

//get single subscription plan
const getSingleSubscriptionPlan = async (id: string) => {
  const plan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!plan)
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription plan not found");

  return plan;
};

// update subscription plan
const updateSubscriptionPlan = async (
  id: string,
  data: Partial<ISubscriptionPlan>
) => {
  // Fetch existing plan
  const existingPlan = await prisma.subscriptionPlan.findUnique({
    where: { id },
  });

  if (!existingPlan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription plan not found");
  }

  // Normalize name if provided
  if (data.name) {
    data.name = data.name.toUpperCase();
  }

  let stripeProductId = existingPlan.stripeProductId;
  let stripePriceId = existingPlan.stripePriceId;

  try {
    // Update product name if name changed
    if (data.name && data.name !== existingPlan.name) {
      const updatedProduct = await StripeService.updateStripeProduct(
        stripeProductId,
        data.name
      );
      stripeProductId = updatedProduct.id;
    }

    // Update price if price or interval changed
    if (
      (data.price !== undefined && data.price !== existingPlan.price) ||
      (data.interval && data.interval !== existingPlan.interval)
    ) {
      // Mark old price as inactive
      await StripeService.deleteStripePrice(stripePriceId);

      // Create new price
      const newPrice = await StripeService.createStripeProductPrice(
        data.price ?? existingPlan.price,
        stripeProductId,
        data.interval ?? existingPlan.interval
      );
      stripePriceId = newPrice.id;
    }

    // Build update payload
    const updateData: any = {
      ...data,
      stripeProductId,
      stripePriceId,
    };

    // Handle feature updates (replace all features if passed)
    if (data.features) {
      updateData.features = {
        deleteMany: {}, 
        create: data.features.map((f: any) => ({
          name: f.name,
          description: f.description,
        })),
      };
    }

    // DB update inside transaction
    const updatedPlan = await prisma.$transaction(async (tx) => {
      return await tx.subscriptionPlan.update({
        where: { id },
        data: updateData,
      });
    });

    return updatedPlan;
  } catch (error: any) {
    console.error("Subscription plan update failed:", error);
    throw new ApiError(httpStatus.INTERNAL_SERVER_ERROR, error.message);
  }
};

// delete subscription plan
const deleteSubscriptionPlan = async (id: string) => {
  // Fetch the plan to get Stripe IDs
  const plan = await prisma.subscriptionPlan.findUnique({ where: { id } });
  if (!plan) {
    throw new ApiError(httpStatus.NOT_FOUND, "Subscription plan not found");
  }

  try {
    // Deactivate Stripe price
    if (plan.stripePriceId) {
      await StripeService.deleteStripePrice(plan.stripePriceId);
    }
    // Delete Stripe product
    if (plan.stripeProductId) {
      await StripeService.deleteStripeProduct(plan.stripeProductId);
    }
    // Delete the plan from DB
    await prisma.subscriptionPlan.delete({ where: { id } });
    return null;
  } catch (error: any) {
    console.log(error);
    console.error("Subscription plan deletion failed:", error);
    throw new ApiError(500, error.message);
  }
};

// export SubscriptionPlanService
export const SubscriptionPlanService = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getMySubscriptionPlan,
  getSingleSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
};

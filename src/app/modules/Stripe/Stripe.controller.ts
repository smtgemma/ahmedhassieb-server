import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { StripeService } from "./Stripe.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import ApiError from "../../../errors/ApiErrors";
import Stripe from "stripe";
import stripe from "../../../shared/stripe";
import config from "../../../config";
import prisma from "../../../shared/prisma";

// Create Stripe customer
const createStripeCustomer = catchAsync(async (req: Request, res: Response) => {
  const result = await StripeService.createStripeCustomer(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: result.success,
    message: result.success
      ? "Stripe customer created successfully"
      : "Failed to create Stripe customer",
    data: result,
  });
});

// Update Stripe customer
const updateStripeCustomer = catchAsync(async (req: Request, res: Response) => {
  const { stripeCustomerId } = req.params;
  const result = await StripeService.updateStripeCustomer(
    stripeCustomerId,
    req.body
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: result.success,
    message: result.success
      ? "Stripe customer updated successfully"
      : "Failed to update Stripe customer",
    data: result,
  });
});

// Create payment intent for booking
const createPaymentIntent = catchAsync(async (req: Request, res: Response) => {
  const result = await StripeService.createPaymentIntent(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: result.success,
    message: result.success
      ? "Payment intent created successfully"
      : "Failed to create payment intent",
    data: result,
  });
});

// Create Stripe product
const createStripeProduct = catchAsync(async (req: Request, res: Response) => {
  const { planType } = req.body;
  const result = await StripeService.createStripeProduct(planType);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe product created successfully",
    data: result,
  });
});

// Update Stripe product
const updateStripeProduct = catchAsync(async (req: Request, res: Response) => {
  const { productId } = req.params;
  const { planType } = req.body;
  const result = await StripeService.updateStripeProduct(productId, planType);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Stripe product updated successfully",
    data: result,
  });
});

// Create Stripe product price
const createStripeProductPrice = catchAsync(
  async (req: Request, res: Response) => {
    const { amount, productId, interval } = req.body;
    const result = await StripeService.createStripeProductPrice(
      amount,
      productId,
      interval
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe product price created successfully",
      data: result,
    });
  }
);

// Update Stripe product price
const updateStripeProductPrice = catchAsync(
  async (req: Request, res: Response) => {
    const { oldPriceId, newAmount, productId, interval } = req.body;
    const result = await StripeService.updateStripeProductPrice(
      oldPriceId,
      newAmount,
      productId,
      interval
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe product price updated successfully",
      data: result,
    });
  }
);

// Create Stripe subscription
const createStripeSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const {
      customerId,
      stripePriceId,
      userId,
      planId,
      planName,
      price,
      paymentMethodId,
    } = req.body;
    const result = await StripeService.createStripeSubscription(
      customerId,
      stripePriceId,
      userId,
      planId,
      planName,
      price,
      paymentMethodId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe subscription created successfully",
      data: result,
    });
  }
);

// Update Stripe subscription
const updateStripeSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { stripeSubId } = req.params;
    const { stripePriceId, userId, planId, planName, price } = req.body;
    const result = await StripeService.updateStripeSubscription(
      stripeSubId,
      stripePriceId,
      userId,
      planId,
      planName,
      price
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe subscription updated successfully",
      data: result,
    });
  }
);

// Cancel Stripe subscription
const cancelStripeSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const { stripeSubId } = req.params;
    const { userId } = req.body;
    const result = await StripeService.cancelStripeSubscription(
      stripeSubId,
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe subscription cancelled successfully",
      data: result,
    });
  }
);


//! Host Stripe Account
const createHostStripeAccount = catchAsync(
  async (req: Request, res: Response) => {
    const result = await StripeService.createHostStripeAccount(req.user.id);

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Stripe Connect account created successfully",
      data: result,
    });
  }
);

const transferHostEarnings = catchAsync(async (req: Request, res: Response) => {
  const { hostEarnings, hostConnectedAccountId, bookingId, payoutPeriod } =
    req.body;

  const result = await StripeService.transferHostEarnings({
    hostEarnings,
    hostConnectedAccountId,
    bookingId,
    payoutPeriod,
  });

  if (!result.success) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      result.error || "Failed to transfer earnings"
    );
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Earnings transferred successfully",
    data: result.transfer,
  });
});

// stripeWebhookHandler


export const StripeController = {
  createStripeCustomer,
  updateStripeCustomer,
  createPaymentIntent,
  createStripeProduct,
  updateStripeProduct,
  createStripeProductPrice,
  updateStripeProductPrice,
  createStripeSubscription,
  updateStripeSubscription,
  cancelStripeSubscription,
  createHostStripeAccount,
  transferHostEarnings,
  
};

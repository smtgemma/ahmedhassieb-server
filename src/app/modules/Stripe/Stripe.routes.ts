import express from "express";
import { StripeController } from "./Stripe.controller";
import auth from "../../middlewares/auth";
import { UserRole } from "@prisma/client";
import validateRequest from "../../middlewares/validateRequest";
import { transferEarningsZodSchema } from "./Stripe.validation";
import { stripeWebhookHandler } from "./Stripe.service";

const router = express.Router();

router.post("/customer", StripeController.createStripeCustomer);

router.put(
  "/customer/:stripeCustomerId",
  StripeController.updateStripeCustomer
);

router.post("/payment-intent", StripeController.createPaymentIntent);

router.post("/product", StripeController.createStripeProduct);

router.put("/product/:productId", StripeController.updateStripeProduct);

router.post("/product/price", StripeController.createStripeProductPrice);

router.put("/product/price", StripeController.updateStripeProductPrice);

router.post("/subscription", StripeController.createStripeSubscription);

router.put(
  "/subscription/:stripeSubId",
  StripeController.updateStripeSubscription
);

router.patch(
  "/subscription/:stripeSubId/cancel",
  StripeController.cancelStripeSubscription
);

router.post(
  "/create-host-account",
  auth(),
  StripeController.createHostStripeAccount
);

router.post(
  "/transfer-earnings",
  auth(UserRole.ADMIN),
  validateRequest(transferEarningsZodSchema),
  StripeController.transferHostEarnings
);

// IMPORTANT: raw body required
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  stripeWebhookHandler
);

export const StripeRoutes = router;

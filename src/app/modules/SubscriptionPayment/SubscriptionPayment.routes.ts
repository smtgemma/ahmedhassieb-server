// SubscriptionPayment.routes: Module file for the SubscriptionPayment.routes functionality.

import express from "express";
import { SubscriptionPaymentController } from "./SubscriptionPayment.controller";
import auth from "../../middlewares/auth";
const router = express.Router();

router.post(
  "/",
  auth(),
  SubscriptionPaymentController.createSubscriptionPayment
);

// cancelStripeSubscription
router.put(
  "/cancel/:subscriptionId",
  auth(),
  SubscriptionPaymentController.cancelStripeSubscription
);

//changeSubscriptionPlan
router.put(
  "/change",
  auth(),
  SubscriptionPaymentController.changeSubscriptionPlan
);

//addNewPaymentMethod
router.put(
  "/add-new-payment-method",
  auth(),
  SubscriptionPaymentController.addNewPaymentMethod
);

//setDefaultPaymentMethod
router.put(
  "/set-default-payment-method",
  auth(),
  SubscriptionPaymentController.setDefaultPaymentMethod
);

//getAllPaymentMethods
router.get(
  "/payment-methods",
  auth(),
  SubscriptionPaymentController.getAllPaymentMethods
);

//getPaymentByUserId
router.get("/", SubscriptionPaymentController.getAllPayments);
router.get("/:id", SubscriptionPaymentController.getSinglePayment);
//get payment by user id
router.get("/user/me",auth(), SubscriptionPaymentController.getPaymentByUserId);
router.put("/:id", SubscriptionPaymentController.updatePayment);
router.delete("/:id", SubscriptionPaymentController.deletePayment);

export const SubscriptionPaymentRoutes = router;

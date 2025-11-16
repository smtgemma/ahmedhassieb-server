// SubscriptionPlan.routes: Module file for the SubscriptionPlan.routes functionality.
import express from "express";

import validateRequest from "../../middlewares/validateRequest";

import auth from "../../middlewares/auth";
import { SubscriptionPlanValidation } from "./SubscriptionPlan.validation";
import { SubscriptionPlanController } from "./SubscriptionPlan.controller";

const router = express.Router();

router.post(
  "/",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(SubscriptionPlanValidation.createSubscriptionPlanSchema),
  SubscriptionPlanController.createSubscriptionPlan
);

router.get("/", SubscriptionPlanController.getAllSubscriptionPlans);

//getMySubscriptionPlan
router.get("/me", auth(), SubscriptionPlanController.getMySubscriptionPlan);

router.get("/:id", SubscriptionPlanController.getSingleSubscriptionPlan);

router.put(
  "/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  validateRequest(SubscriptionPlanValidation.updateSubscriptionPlanSchema),
  SubscriptionPlanController.updateSubscriptionPlan
);

router.delete(
  "/:id",
//   auth(UserRole.ADMIN, UserRole.SUPER_ADMIN),
  SubscriptionPlanController.deleteSubscriptionPlan
);

export const SubscriptionPlanRoutes = router;
import express from "express";
import { userRoutes } from "../modules/User/user.route";
import { AuthRoutes } from "../modules/Auth/auth.routes";
import { ImageRoutes } from "../modules/Image/Image.routes";
import { SubscriptionPlanRoutes } from "../modules/SubscriptionPlan/SubscriptionPlan.routes";
import { SubscriptionPaymentRoutes } from "../modules/SubscriptionPayment/SubscriptionPayment.routes";
import { DealRoutes } from "../modules/Deal/Deal.routes";

const router = express.Router();

const moduleRoutes = [
  {
    path: "/users",
    route: userRoutes,
  },
  {
    path: "/auth",
    route: AuthRoutes,
  },
  {
    path: "/images",
    route: ImageRoutes,
  },
  {
    path: "/subscription-plans",
    route: SubscriptionPlanRoutes,
  },
  {
    path: "/subscription-payments",
    route: SubscriptionPaymentRoutes,
  },
  {
    path: "/deals",
    route: DealRoutes,
  },
];

moduleRoutes.forEach((route) => router.use(route.path, route.route));

export default router;

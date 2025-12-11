// Deal.routes: Module file for the Deal.routes functionality.
import express from "express";

import { DealController } from "./Deal.controller";
import validateRequest from "../../middlewares/validateRequest";
import auth from "../../middlewares/auth";

const router = express.Router();

//getUserDashboard
router.get("/user-dashboard", auth(), DealController.getUserDashboard);

//updateDashboard
router.put("/dashboard/:userPackageId", DealController.updateDashboard);

//assignPackageToUser
router.post("/assign-package-to-user", DealController.assignPackageToUser);

//removePackageFromUser
router.delete(
  "/remove-package-from-user/:userPackageId",
  DealController.removePackageFromUser
);

//createRemainingPaymentInvoice
router.post(
  "/create-remaining-payment-invoice",
  auth(),
  DealController.createRemainingPaymentInvoice
);

router.post("/add-new-deal", DealController.addNewDeal);

router.get("/:userId", DealController.getDealByUserId);

router.put("/update-deal", DealController.updateDeal);

router.put("/reset-deal", DealController.resetDeal);

router.put("/send-email-to-user", DealController.sendEmailToUser);

export const DealRoutes = router;

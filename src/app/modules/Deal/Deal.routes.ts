// Deal.routes: Module file for the Deal.routes functionality.
import express from "express";

import { DealController } from "./Deal.controller";
import validateRequest from "../../middlewares/validateRequest";

const router = express.Router();

router.post("/add-new-deal", DealController.addNewDeal);

router.get("/get-deal-by-user-id", DealController.getDealByUserId);

router.put("/update-deal", DealController.updateDeal);

router.put("/reset-deal", DealController.resetDeal);

router.put("/send-email-to-user", DealController.sendEmailToUser);

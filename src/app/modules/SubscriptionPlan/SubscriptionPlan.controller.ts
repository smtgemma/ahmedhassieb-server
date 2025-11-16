// SubscriptionPlan.controller: Module file for the SubscriptionPlan.controller functionality.
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";

import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import { SubscriptionPlanService } from "./SubscriptionPlan.service";

// Create Subscription Plan
const createSubscriptionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.createSubscriptionPlan(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plan created successfully",
    data: result,
  });
});

// Get All Subscription Plans
const getAllSubscriptionPlans = catchAsync(async (_req: Request, res: Response) => {
  const result = await SubscriptionPlanService.getAllSubscriptionPlans();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plans retrieved successfully",
    data: result,
  });
});

//getMySubscriptionPlan
const getMySubscriptionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.getMySubscriptionPlan(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plan retrieved successfully",
    data: result,
  });
});

// Get Single Subscription Plan
const getSingleSubscriptionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.getSingleSubscriptionPlan(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plan retrieved successfully",
    data: result,
  });
});

// Update Subscription Plan
const updateSubscriptionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.updateSubscriptionPlan(req.params.id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plan updated successfully",
    data: result,
  });
});

// Delete Subscription Plan
const deleteSubscriptionPlan = catchAsync(async (req: Request, res: Response) => {
  const result = await SubscriptionPlanService.deleteSubscriptionPlan(req.params.id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription plan deleted successfully",
    data: result,
  });
});

export const SubscriptionPlanController = {
  createSubscriptionPlan,
  getAllSubscriptionPlans,
  getMySubscriptionPlan,
  getSingleSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
};
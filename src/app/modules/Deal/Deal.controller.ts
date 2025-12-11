// Deal.controller: Module file for the Deal.controller functionality.
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import pick from "../../../shared/pick";
import { DealService } from "./Deal.service";

//addNewDeal
const addNewDeal = catchAsync(async (req: Request, res: Response) => {
  const { planId, dealId, userId } = req.body;
  const result = await DealService.addNewDeal(userId, planId, dealId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal added successfully!",
    data: result,
  });
});

//getDealByUserId
const getDealByUserId = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.userId;
  const result = await DealService.getDealByUserId(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal retrieve successfully!",
    data: result,
  });
});

//updateDeal
const updateDeal = catchAsync(async (req: Request, res: Response) => {
  const result = await DealService.updateDeal(req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal updated successfully!",
    data: result,
  });
});

//resetDeal
const resetDeal = catchAsync(async (req: Request, res: Response) => {
  const result = await DealService.resetDeal(req.body.dealId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal reset successfully!",
    data: result,
  });
});

// send email to user
const sendEmailToUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.body.userId;
  const result = await DealService.sendEmailToUser(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email sent successfully!",
    data: result,
  });
});

// getUserDashboard;
const getUserDashboard = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const result = await DealService.getUserDashboard(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User dashboard retrieved successfully!",
    data: result,
  });
});

//updateDashboard
const updateDashboard = catchAsync(async (req: Request, res: Response) => {
  const userPackageId = req.params.userPackageId;
  const result = await DealService.updateDashboard(userPackageId, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Dashboard updated successfully!",
    data: result,
  });
});

//assignPackageToUser
const assignPackageToUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.body.userId;
  const planId = req.body.planId;
  const result = await DealService.assignPackageToUser(userId, planId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Package assigned successfully!",
    data: result,
  });
});

//removePackageFromUser
const removePackageFromUser = catchAsync(async (req: Request, res: Response) => {
  const userPackageId = req.params.userPackageId;
  const result = await DealService.removePackageFromUser(userPackageId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Package removed successfully!",
    data: result,
  });
});

export const DealController = {
  addNewDeal,
  getDealByUserId,
  updateDeal,
  resetDeal,
  sendEmailToUser,
  getUserDashboard,
  updateDashboard,
  assignPackageToUser,
  removePackageFromUser,
};

// Deal.controller: Module file for the Deal.controller functionality.
import httpStatus from "http-status";
import catchAsync from "../../../shared/catchAsync";
import sendResponse from "../../../shared/sendResponse";
import { Request, Response } from "express";
import pick from "../../../shared/pick";
import { DealService } from "./Deal.service";

//addNewDeal
const addNewDeal = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user.id;
  const { planId, dealId } = req.body;
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
  const userId = req.user.id;
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
  const userId = req.user.id;
  const { planId, dealId } = req.body;
  const result = await DealService.updateDeal(userId, planId, dealId,req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal updated successfully!",
    data: result,
  });
});

//resetDeal
const resetDeal = catchAsync(async (req: Request, res: Response) => {
  const dealId = req.params.id;
  const result = await DealService.resetDeal(dealId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Deal reset successfully!",
    data: result,
  });
});


// send email to user 
const sendEmailToUser = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id;
  const result = await DealService.sendEmailToUser(userId);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email sent successfully!",
    data: result,
  });
});

export const DealController = {
  addNewDeal,
  getDealByUserId,
  updateDeal,
  resetDeal,
  sendEmailToUser
};

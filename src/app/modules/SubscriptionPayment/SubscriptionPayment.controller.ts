// SubscriptionPayment.controller: Module file for the SubscriptionPayment.controller functionality.
import { Request, Response } from "express";
import catchAsync from "../../../shared/catchAsync";
import { SubscriptionPaymentService } from "./SubscriptionPayment.service";
import sendResponse from "../../../shared/sendResponse";
import httpStatus from "http-status";
import pick from "../../../shared/pick";
import { subscriptionPaymentFilterableFields } from "./SubscriptionPayment.constant";

const createSubscriptionPayment = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result = await SubscriptionPaymentService.createSubscriptionPayment(
      req.body,
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription payment created successfully",
      data: result,
    });
  }
);

//cancelStripeSubscription
const cancelStripeSubscription = catchAsync(
  async (req: Request, res: Response) => {
    const subscriptionId = req.params.subscriptionId;
    console.log(subscriptionId);
    const userId = req.user.id;
    const result = await SubscriptionPaymentService.cancelStripeSubscription(
      subscriptionId,
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: result.message || "Subscription payment canceled successfully",
      data: result.data,
    });
  }
);

// changeSubscriptionPlan
const changeSubscriptionPlan = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const newPlanId = req.body.newPlanId;
    const result = await SubscriptionPaymentService.changeSubscriptionPlan(
      userId,
      newPlanId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Subscription plan updated successfully",
      data: result,
    });
  }
);

//addNewPaymentMethod
const addNewPaymentMethod = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const paymentMethodId = req.body.paymentMethodId;
    const result = await SubscriptionPaymentService.addNewPaymentMethod(
      userId,
      paymentMethodId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment method added successfully",
      data: result,
    });
  }
);

//setDefaultPaymentMethod
const setDefaultPaymentMethod = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const paymentMethodId = req.body.paymentMethodId;
    const result = await SubscriptionPaymentService.setDefaultPaymentMethod(
      userId,
      paymentMethodId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Default payment method set successfully",
      data: result,
    });
  }
);

//getAllPaymentMethods
const getAllPaymentMethods = catchAsync(
  async (req: Request, res: Response) => {
    const userId = req.user.id;
    const result = await SubscriptionPaymentService.getAllPaymentMethods(
      userId
    );
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Payment methods retrieved successfully",
      data: result,
    });
  }
);

//getAllPayments
const getAllPayments = catchAsync(async (req: Request, res: Response) => {

   const filters = pick(req.query, subscriptionPaymentFilterableFields);
   const options = pick(req.query, ["limit", "page", "sortBy", "sortOrder"]);

  const result = await SubscriptionPaymentService.getAllPayments(
    filters,
    options
  );
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription payments retrieved successfully",
    data: result,
  });
});

//getSinglePayment
const getSinglePayment = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SubscriptionPaymentService.getSinglePayment(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription payment retrieved successfully",
    data: result,
  });
});

//get payment by user id
const getPaymentByUserId = catchAsync(async (req: Request, res: Response) => {
  const id = req.user.id;
  const result = await SubscriptionPaymentService.getPaymentByUserId(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription payment retrieved successfully",
    data: result,
  });
});

//getPaymentByUserId
const updatePayment = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SubscriptionPaymentService.updatePayment(id, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription payment updated successfully",
    data: result,
  });
});

//deletePayment
const deletePayment = catchAsync(async (req: Request, res: Response) => {
  const id = req.params.id;
  const result = await SubscriptionPaymentService.deletePayment(id);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Subscription payment deleted successfully",
    data: result,
  });
});

export const SubscriptionPaymentController = {
  createSubscriptionPayment,
  cancelStripeSubscription,
  changeSubscriptionPlan,
  addNewPaymentMethod,
  setDefaultPaymentMethod,
  getAllPaymentMethods,
  getAllPayments,
  getSinglePayment,
  updatePayment,
  deletePayment,
  getPaymentByUserId,
};

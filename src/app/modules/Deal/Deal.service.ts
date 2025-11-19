import ApiError from "../../../errors/ApiErrors";
import emailSender from "../../../shared/emailSernder";
import prisma from "../../../shared/prisma";
import httpStatus from "http-status";

// Deal.service: Module file for the Deal.service functionality.
const addNewDeal = async (userId: string, planId: string, dealId: string) => {
  const isPlanExist = await prisma.subscriptionPlan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!isPlanExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  const isUserExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const deal = await prisma.deal.findFirst({
    where: {
      userId: userId,
    },
  });

  const result = await prisma.deal.update({
    where: {
      id: dealId,
    },
    data: {
      planId: [...deal?.planId!, planId],
    },
  });

  return result;
};

const getDealByUserId = async (userId: string) => {
  const result = await prisma.deal.findFirst({
    where: {
      userId: userId,
    },
    include: {
      plans: true,
    },
  });
  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  }
  return result;
};

const updateDeal = async (
  userId: string,
  planId: string,
  dealId: string,
  payload: any
) => {
  const isPlanExist = await prisma.subscriptionPlan.findUnique({
    where: {
      id: planId,
    },
  });

  if (!isPlanExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  const isUserExist = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  const deal = await prisma.deal.findFirst({
    where: {
      userId: userId,
    },
  });

  const result = await prisma.deal.update({
    where: {
      id: dealId,
    },
    data: payload,
  });

  return result;
};

const resetDeal = async (dealId: string) => {
  const isDealExist = await prisma.deal.findUnique({
    where: {
      id: dealId,
    },
  });

  if (!isDealExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  }

  const result = await prisma.deal.update({
    where: {
      id: dealId,
    },
    data: {
      activeDeals: 0,
      completedDeals: 0,
      payoutAmount: 0,
      tokens: 0,
      planId: [],
    },
  });
  return result;
};

const sendEmailToUser = async (userId: string) => {
  const result = await prisma.user.findUnique({
    where: {
      id: userId,
    },
  });

  if (!result) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  await emailSender("Deal ", result.email, "test mail");
};

// Exporting the Deal.service module.
export const DealService = {
  addNewDeal,
  getDealByUserId,
  updateDeal,
  resetDeal,
  sendEmailToUser,
};

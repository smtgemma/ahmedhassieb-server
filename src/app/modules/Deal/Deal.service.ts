import ApiError from "../../../errors/ApiErrors";
import emailSender from "../../../shared/emailSernder";
import prisma from "../../../shared/prisma";
import httpStatus from "http-status";

// Deal.service: Module file for the Deal.service functionality.
const addNewDeal = async (userId: string, planId: string, dealId: string) => {
  // check plan exists
  const isPlanExist = await prisma.subscriptionPlan.findUnique({
    where: { id: planId },
  });

  if (!isPlanExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "Plan not found");
  }

  // check user exists
  const isUserExist = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!isUserExist) {
    throw new ApiError(httpStatus.NOT_FOUND, "User not found");
  }

  // get deal
  const deal = await prisma.deal.findUnique({
    where: { id: dealId },
  });

  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  }

  // planId is stored as array of strings
  const alreadyAdded = deal.planId.includes(planId);

  if (alreadyAdded) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Plan already added to this deal"
    );
  }

  // update deal with new planId
  const result = await prisma.deal.update({
    where: { id: dealId },
    data: {
      planId: {
        push: planId, // best approach for String[] fields
      },
    },
  });

  return result;
};

const getDealByUserId = async (userId: string) => {
  const deal = await prisma.deal.findFirst({
    where: {
      userId: userId,
    },
  });
  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  }
  // Fetch all plans for the deal
  const plans = await prisma.subscriptionPlan.findMany({
    where: {
      id: {
        in: deal.planId, // array lookup
      },
    },
  });

  return {
    ...deal,
    plans, // add full plan objects
  };
};

// update deal
const updateDeal = async (payload: any) => {
  const deal = await prisma.deal.findFirst({
    where: {
      userId: payload.userId,
    },
  });

  if (!deal) {
    throw new ApiError(httpStatus.NOT_FOUND, "Deal not found");
  }

  const result = await prisma.deal.update({
    where: {
      id: payload.dealId,
    },
    data: {
      activeDeals: payload.activeDeals || deal.activeDeals,
      completedDeals: payload.completedDeals || deal.completedDeals,
      payoutAmount: payload.payoutAmount || deal.payoutAmount,
      payoutDate: payload.payoutDate || deal.payoutDate,
      tokens: payload.tokens || deal.tokens,
    },
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
      payoutDate: null,
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

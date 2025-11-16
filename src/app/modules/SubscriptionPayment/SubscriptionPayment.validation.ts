// SubscriptionPayment.validation: Module file for the SubscriptionPayment.validation functionality.
import { z } from 'zod';

export const SubscriptionPaymentValidation = {
  createSubscriptionPaymentSchema: z.object({
    firstName: z.string({
      required_error: "First name is required"
    }),
    lastName: z.string({
      required_error: "Last name is required"
    }),
    email: z.string({
      required_error: "Email is required"
    }).email("Invalid email format"),
    phone: z.string({
      required_error: "Phone number is required"
    }),
    country: z.string({
      required_error: "Country is required"
    }),
    address: z.string({
      required_error: "Address is required"
    }),
    city: z.string({
      required_error: "City is required"
    }),
    zipCode: z.string({
      required_error: "Zip code is required"
    }),
    paymentMethodId: z.string({
      required_error: "Payment method ID is required"
    }),
  }),

  updateSubscriptionPaymentSchema: z.object({
    paymentStatus: z.enum(["PENDING", "PROCESSING", "COMPLETED", "FAILED", "CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"], {
      required_error: "Payment status is required"
    }),
    transactionId: z.string().optional(),
    paymentIntentId: z.string().optional(),
    refundAmount: z.number().optional(),
    refundReason: z.string().optional(),
    failureReason: z.string().optional(),
    paidAt: z.string().optional().refine((date) => {
      return !date || !isNaN(Date.parse(date));
    }, "Invalid paid date"),
    refundedAt: z.string().optional().refine((date) => {
      return !date || !isNaN(Date.parse(date));
    }, "Invalid refund date")
  })
};
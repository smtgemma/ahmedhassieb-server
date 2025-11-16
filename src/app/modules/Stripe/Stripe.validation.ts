// Stripe.validation: Module file for the Stripe.validation functionality.
import { z } from "zod";

export const transferEarningsZodSchema = z.object({
  body: z.object({
    hostEarnings: z
      .number({
        required_error: "Host earnings amount is required",
      })
      .min(0.5, "Minimum transfer amount is $0.50"),
    hostConnectedAccountId: z.string({
      required_error: "Host Stripe account ID is required",
    }),
    bookingId: z.string({
      required_error: "Booking ID is required",
    }),
    payoutPeriod: z.enum(["daily", "weekly", "monthly"], {
      required_error: "Payout period is required",
    }),
  }),
});

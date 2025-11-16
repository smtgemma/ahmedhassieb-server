import { z } from "zod";

const featureSchema = z.object({
  name: z.string({
    required_error: "Feature name is required",
  }),
  description: z
    .string({
      invalid_type_error: "Feature description must be a string",
    })
    .optional(),
});

export const SubscriptionPlanValidation = {
  createSubscriptionPlanSchema: z.object({
    name: z.string({
      required_error: "Name is required",
    }),
    price: z
  .number({
    required_error: "Price is required",
  })
  .min(0, "Price must be greater than or equal to 0"),
    description: z.string({
      required_error: "Description is required",
    }),
    currency: z
      .string({
        required_error: "Currency is required",
      })
      .default("usd"),
    interval: z.enum(["month", "year", "week", "day"], {
      required_error: "Interval is required",
    }),
    features: z
      .array(featureSchema, {
        required_error: "At least one feature is required",
      })
      .min(1, "A subscription plan must have at least one feature"),
    isActive: z.boolean().optional().default(true),
  }),

  updateSubscriptionPlanSchema: z.object({
    name: z
      .string({
        invalid_type_error: "Name must be a string",
      })
      .optional(),
    price: z
      .number({
        invalid_type_error: "Price must be a number",
      })
      .positive("Price must be greater than 0")
      .optional(),
    description: z
      .string({
        invalid_type_error: "Description must be a string",
      })
      .optional(),
    currency: z
      .string({
        invalid_type_error: "Currency must be a string",
      })
      .optional(),
    interval: z.enum(["month", "year", "week", "day"]).optional(),
    features: z
      .array(featureSchema, {
        invalid_type_error: "Features must be an array of objects",
      })
      .optional(),
    isActive: z.boolean().optional(),
  }),
};

import { z } from "zod";

const amountSchema = z
  .object({
    type: z.enum(["PERCENTAGE", "PRICE"]),
    value: z.number(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "PERCENTAGE" && (data.value < 0 || data.value > 100)) {
      ctx.addIssue({
        path: ["value"],
        message: "Percentage value must be between 0 and 100",
        code: "custom",
      });
    }

    if (data.type === "PRICE" && data.value <= 0) {
      ctx.addIssue({
        path: ["value"],
        message: "Price value must be greater than 0",
        code: "custom",
      });
    }
  });

const fullBillingSchema = amountSchema
  .extend({
    paymentMethod: z.literal("FULL"),
  })
  .strict();

const partialBaseSchema = amountSchema.extend({
  paymentMethod: z.literal("PARTIAL"),
});

const partialBillingSchema = z.discriminatedUnion("chargeTrigger", [
  partialBaseSchema.extend({
    chargeTrigger: z.literal("TIME_AFTER_CHECKOUT"),
    daysAfterCheckout: z
      .number()
      .int()
      .min(1)
      .transform((days) => `P${days}D`),
  }),

  partialBaseSchema.extend({
    chargeTrigger: z.literal("EXACT_TIME"),
    chargeDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD")
      .transform((date) => `${date}T00:00:00Z`),
  }),
]);

export const billingPolicySchema = z.union([
  fullBillingSchema,
  partialBillingSchema,
]);

const asapDeliverySchema = z.object({
  fulfillmentTrigger: z.literal("ASAP"),
});

const unknownDeliverySchema = z.object({
  fulfillmentTrigger: z.literal("UNKNOWN"),
});

const exactTimeDeliverySchema = z.object({
  fulfillmentTrigger: z.literal("EXACT_TIME"),
  fulfillmentExactTime: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
});

export const deliveryPolicySchema = z.discriminatedUnion("fulfillmentTrigger", [
  asapDeliverySchema,
  unknownDeliverySchema,
  exactTimeDeliverySchema,
]);

const resourcesSchema = z
  .object({
    productIds: z
      .array(
        z
          .string()
          .regex(
            /^gid:\/\/shopify\/Product\/\d+$/,
            "Invalid Shopify Product ID",
          ),
      )
      .default([]),

    variantIds: z
      .array(
        z
          .string()
          .regex(
            /^gid:\/\/shopify\/ProductVariant\/\d+$/,
            "Invalid Shopify Variant ID",
          ),
      )
      .default([]),
  })
  .superRefine((data, ctx) => {
    if (data.productIds.length === 0 && data.variantIds.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one productId or variantId must be provided",
        path: ["productIds"],
      });
    }
  });

export const offerSchema = z.object({
  groupName: z.string().trim().min(1),
  planName: z.string().trim().min(1),
  planDescription: z.string().trim().min(1),
  billingPolicy: billingPolicySchema,
  deliveryPolicy: deliveryPolicySchema,
  resources: resourcesSchema,
});

import { z } from "zod";

export const planFeatureSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  hint: z.string().optional(),
});

export const planSchema = z.object({
  id: z.string().min(1),
  tier: z.enum(["basic", "vip", "pro"]),
  name: z.string().min(1),
  tagline: z.string().min(1),
  priceMonthly: z.number().int().min(0),
  commissionPercent: z.number().min(0).max(100),
  featuredDays: z.number().int().min(0).max(365),
  homepageBanner: z.boolean(),
  priorityRecommendations: z.boolean(),
  featureIds: z.array(z.string()),
  active: z.boolean(),
  highlighted: z.boolean(),
  order: z.number().int(),
});

export const billingContentSchema = z.object({
  features: z.array(planFeatureSchema).min(1),
  plans: z.array(planSchema).min(1),
});

/** What Super Admin may change about a plan. Ids and tiers are structural. */
export const planEditSchema = z.object({
  name: z.string().min(1).max(40),
  tagline: z.string().min(1).max(90),
  priceMonthly: z.number().int().min(0).max(100_000_00),
  commissionPercent: z.number().min(0).max(100),
  featuredDays: z.number().int().min(0).max(365),
  homepageBanner: z.boolean(),
  priorityRecommendations: z.boolean(),
  featureIds: z.array(z.string()),
  active: z.boolean(),
  highlighted: z.boolean(),
});

export const promotionEditSchema = z.object({
  code: z
    .string()
    .min(3)
    .max(20)
    .regex(/^[A-Z0-9-]+$/, "Лише великі латинські літери, цифри та дефіс"),
  description: z.string().min(1).max(120),
  percentOff: z.number().int().min(1).max(100),
  expiresAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .nullable(),
  active: z.boolean(),
});

export const placementEditSchema = z.object({
  clubId: z.string().min(1),
  planId: z.string().min(1),
  /** Days from now; 0 clears the feature window. */
  featuredDays: z.number().int().min(0).max(365),
  bannerDays: z.number().int().min(0).max(365),
  bannerHeadline: z.string().max(80).optional(),
});

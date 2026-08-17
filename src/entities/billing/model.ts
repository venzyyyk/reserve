/**
 * Commercial domain: what clubs buy, and what that buys them on the
 * platform. Kept separate from `entities/club` on purpose — a club's page
 * is editorial content, its placement is money-driven state that changes
 * without anyone touching the catalogue.
 */

export type PlanTier = "basic" | "vip" | "pro";

/**
 * A capability a plan can include. The catalogue is data too, so Super
 * Admin can add "Пріоритет у пошуку" without a deploy.
 */
export interface PlanFeature {
  id: string;
  label: string;
  /** Shown under the label in the comparison table when it needs nuance. */
  hint?: string;
}

export interface Plan {
  id: string;
  tier: PlanTier;
  name: string;
  /** One line under the name on the pricing card. */
  tagline: string;
  /** Integer kopiykas per month; 0 means free. */
  priceMonthly: number;
  /** Percent taken from each online booking. 0 = none. */
  commissionPercent: number;
  /**
   * How long a club stays featured after activation, in days. 0 = never
   * featured. Configurable per plan — VIP is exactly this dial.
   */
  featuredDays: number;
  /** PRO-level placement on the homepage banner rotation. */
  homepageBanner: boolean;
  /** Ranked above equal alternatives in recommendations. */
  priorityRecommendations: boolean;
  /** Feature ids from the catalogue that this plan includes. */
  featureIds: string[];
  /** Hidden from the public page when false; existing clubs keep it. */
  active: boolean;
  /** Visual emphasis on the pricing section — at most one. */
  highlighted: boolean;
  order: number;
}

/** What a specific club currently has. One row per club. */
export interface Placement {
  clubId: string;
  planId: string;
  /** ISO instant; null = not featured. */
  featuredUntil: string | null;
  /** ISO instant; null = no banner. */
  bannerUntil: string | null;
  /** Shown on the homepage banner instead of the club's story. */
  bannerHeadline?: string;
  updatedAt: string;
}

export interface Promotion {
  id: string;
  code: string;
  description: string;
  /** Percent off the plan price, 1–100. */
  percentOff: number;
  /** ISO date; null = open-ended. */
  expiresAt: string | null;
  active: boolean;
  /** How many times it has been applied — read-only, for the admin table. */
  usedCount: number;
}

export const PLAN_TIER_ORDER: readonly PlanTier[] = ["basic", "vip", "pro"];

import type { Placement, Plan, PlanFeature, Promotion } from "./model";

export interface PlanEdit {
  name: string;
  tagline: string;
  priceMonthly: number;
  commissionPercent: number;
  featuredDays: number;
  homepageBanner: boolean;
  priorityRecommendations: boolean;
  featureIds: string[];
  active: boolean;
  highlighted: boolean;
}

export interface PlacementEdit {
  clubId: string;
  planId: string;
  /** Days from now; 0 clears the window. */
  featuredDays: number;
  bannerDays: number;
  bannerHeadline?: string;
}

/** Unchanged by M2b — the memory and MongoDB adapters both satisfy it. */
export interface BillingRepository {
  listFeatures(): Promise<PlanFeature[]>;
  listPlans(): Promise<Plan[]>;
  planById(id: string): Promise<Plan | undefined>;
  updatePlan(id: string, edit: PlanEdit): Promise<Plan | null>;
  listPlacements(): Promise<Placement[]>;
  placementFor(clubId: string): Promise<Placement | undefined>;
  setPlacement(edit: PlacementEdit): Promise<Placement>;
  listPromotions(): Promise<Promotion[]>;
  savePromotion(
    id: string | null,
    edit: Omit<Promotion, "id" | "usedCount">,
  ): Promise<Promotion>;
  deletePromotion(id: string): Promise<void>;
  _reset(): Promise<void>;
}

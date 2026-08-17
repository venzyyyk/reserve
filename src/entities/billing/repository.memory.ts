import "server-only";

import {
  processMap,
  processMutex,
  processStore,
} from "@/shared/lib/process-store";

import { addDays } from "./lib";
import type { Placement, Plan, PlanFeature, Promotion } from "./model";
import { billingContentSchema } from "./schema";
import type { BillingRepository, PlacementEdit, PlanEdit } from "./ports";
import rawContent from "./content/plans.uk.json";

/**
 * Commercial state, behind the repository seam (ADR-0004).
 *
 * Plans are *seeded* from content and then live in memory: Super Admin edits
 * them at runtime, which is the whole point of making pricing data. M2b's
 * database swap replaces this adapter; nothing else changes.
 */
const seed = billingContentSchema.parse(rawContent);

const features: PlanFeature[] = processStore("billing.features", () => [
  ...seed.features,
]);
const plans = processMap<Plan>("billing.plans", () =>
  seed.plans.map((plan) => [plan.id, plan] as const),
);
const placements = processMap<Placement>("billing.placements");
const promotions = processMap<Promotion>("billing.promotions", () => [
  [
    "promo_launch",
    {
      id: "promo_launch",
      code: "STARTUA",
      description: "Перші три місяці VIP за півціни для нових клубів",
      percentOff: 50,
      expiresAt: null,
      active: true,
      usedCount: 0,
    },
  ],
]);

const exclusive = processMutex("billing");

/** Development and unit-test adapter. */
export const memoryBillingRepository: BillingRepository = {
  async listFeatures(): Promise<PlanFeature[]> {
    return exclusive(() => [...features]);
  },

  async listPlans(): Promise<Plan[]> {
    return exclusive(() =>
      [...plans.values()].sort((a, b) => a.order - b.order),
    );
  },

  async planById(id: string): Promise<Plan | undefined> {
    return exclusive(() => plans.get(id));
  },

  /**
   * Applies an edit. `highlighted` is exclusive: the pricing section may
   * emphasise one plan, and two "recommended" badges would emphasise none.
   */
  async updatePlan(id: string, edit: PlanEdit): Promise<Plan | null> {
    return exclusive(() => {
      const current = plans.get(id);
      if (!current) return null;

      const known = new Set(features.map((feature) => feature.id));
      const updated: Plan = {
        ...current,
        ...edit,
        featureIds: edit.featureIds.filter((featureId) => known.has(featureId)),
      };
      plans.set(id, updated);

      if (edit.highlighted) {
        for (const [otherId, other] of plans) {
          if (otherId !== id && other.highlighted) {
            plans.set(otherId, { ...other, highlighted: false });
          }
        }
      }
      return updated;
    });
  },

  async listPlacements(): Promise<Placement[]> {
    return exclusive(() => [...placements.values()]);
  },

  async placementFor(clubId: string): Promise<Placement | undefined> {
    return exclusive(() => placements.get(clubId));
  },

  /**
   * Assigns a plan and, optionally, feature/banner windows measured from
   * now. Days rather than dates: "featured for 30 days" is what a sales
   * conversation actually agrees on.
   */
  async setPlacement(edit: PlacementEdit): Promise<Placement> {
    return exclusive(() => {
      const placement: Placement = {
        clubId: edit.clubId,
        planId: edit.planId,
        featuredUntil:
          edit.featuredDays > 0 ? addDays(edit.featuredDays) : null,
        bannerUntil: edit.bannerDays > 0 ? addDays(edit.bannerDays) : null,
        ...(edit.bannerHeadline?.trim()
          ? { bannerHeadline: edit.bannerHeadline.trim() }
          : {}),
        updatedAt: new Date().toISOString(),
      };
      placements.set(edit.clubId, placement);
      return placement;
    });
  },

  async listPromotions(): Promise<Promotion[]> {
    return exclusive(() => [...promotions.values()]);
  },

  async savePromotion(
    id: string | null,
    edit: Omit<Promotion, "id" | "usedCount">,
  ): Promise<Promotion> {
    return exclusive(() => {
      const existing = id ? promotions.get(id) : undefined;
      const promotion: Promotion = {
        id: existing?.id ?? `promo_${crypto.randomUUID().slice(0, 8)}`,
        usedCount: existing?.usedCount ?? 0,
        ...edit,
      };
      promotions.set(promotion.id, promotion);
      return promotion;
    });
  },

  async deletePromotion(id: string): Promise<void> {
    await exclusive(() => {
      promotions.delete(id);
    });
  },

  /** Test seam — the in-memory adapter has no other way to start clean. */
  async _reset(): Promise<void> {
    await exclusive(() => {
      plans.clear();
      for (const plan of seed.plans) plans.set(plan.id, plan);
      placements.clear();
    });
  },
};

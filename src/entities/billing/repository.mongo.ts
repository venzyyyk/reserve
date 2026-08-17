import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import { addDays } from "./lib";
import type { Placement, Plan, PlanFeature, Promotion } from "./model";
import type { BillingRepository, PlacementEdit, PlanEdit } from "./ports";

/**
 * MongoDB billing adapter.
 *
 * This is where "pricing is data" stops being a slogan: Super Admin edits
 * a price, it is written here, and `/for-clubs` reads it on its next
 * revalidation — across restarts and deploys, which is exactly what M3
 * could not promise.
 *
 * Plans and features are seeded by `npm run seed`, never on boot. A
 * repository that quietly re-inserted its defaults would undo an
 * administrator's work the first time a container restarted.
 */
const plans = () => collection<Plan>(COLLECTIONS.billingPlans);
const features = () => collection<PlanFeature>(COLLECTIONS.billingFeatures);
const placements = () => collection<Placement>(COLLECTIONS.placements);
const promotions = () => collection<Promotion>(COLLECTIONS.promotions);

const withoutId = { projection: { _id: 0 } } as const;

export const mongoBillingRepository: BillingRepository = {
  async listFeatures() {
    const documents = await features();
    return documents.find({}, withoutId).toArray();
  },

  async listPlans() {
    const documents = await plans();
    return documents.find({}, withoutId).sort({ order: 1 }).toArray();
  },

  async planById(id: string) {
    const documents = await plans();
    const found = await documents.findOne({ id }, withoutId);
    return found ?? undefined;
  },

  async updatePlan(id: string, edit: PlanEdit) {
    const [planDocs, featureDocs] = await Promise.all([plans(), features()]);

    // A feature id that is not in the catalogue would render as a blank row
    // on the comparison table, so it is dropped at the seam.
    const known = new Set(
      (
        await featureDocs.find({}, { projection: { id: 1, _id: 0 } }).toArray()
      ).map((feature) => feature.id),
    );

    const updated = await planDocs.findOneAndUpdate(
      { id },
      {
        $set: {
          ...edit,
          featureIds: edit.featureIds.filter((featureId) =>
            known.has(featureId),
          ),
        },
      },
      { returnDocument: "after", ...withoutId },
    );
    if (!updated) return null;

    // At most one plan carries the emphasis; the gold budget is one primary
    // call to action per view.
    if (edit.highlighted) {
      await planDocs.updateMany(
        { id: { $ne: id }, highlighted: true },
        { $set: { highlighted: false } },
      );
    }
    return updated;
  },

  async listPlacements() {
    const documents = await placements();
    return documents.find({}, withoutId).toArray();
  },

  async placementFor(clubId: string) {
    const documents = await placements();
    const found = await documents.findOne({ clubId }, withoutId);
    return found ?? undefined;
  },

  async setPlacement(edit: PlacementEdit) {
    const documents = await placements();
    const headline = edit.bannerHeadline?.trim();

    const placement: Placement = {
      clubId: edit.clubId,
      planId: edit.planId,
      // Days from now rather than an end date: "30 днів VIP" is what a sales
      // conversation actually agrees on.
      featuredUntil: edit.featuredDays > 0 ? addDays(edit.featuredDays) : null,
      bannerUntil: edit.bannerDays > 0 ? addDays(edit.bannerDays) : null,
      ...(headline ? { bannerHeadline: headline } : {}),
      updatedAt: new Date().toISOString(),
    };

    await documents.replaceOne({ clubId: edit.clubId }, placement, {
      upsert: true,
    });
    return placement;
  },

  async listPromotions() {
    const documents = await promotions();
    return documents.find({}, withoutId).toArray();
  },

  async savePromotion(
    id: string | null,
    edit: Omit<Promotion, "id" | "usedCount">,
  ) {
    const documents = await promotions();
    const existing = id ? await documents.findOne({ id }, withoutId) : null;

    const promotion: Promotion = {
      id: existing?.id ?? `promo_${crypto.randomUUID().slice(0, 8)}`,
      // Usage is a fact about the past; editing the offer must not reset it.
      usedCount: existing?.usedCount ?? 0,
      ...edit,
    };

    await documents.replaceOne({ id: promotion.id }, promotion, {
      upsert: true,
    });
    return promotion;
  },

  async deletePromotion(id: string) {
    const documents = await promotions();
    await documents.deleteOne({ id });
  },

  async _reset() {
    const [planDocs, featureDocs, placementDocs, promotionDocs] =
      await Promise.all([plans(), features(), placements(), promotions()]);
    await Promise.all([
      planDocs.deleteMany({}),
      featureDocs.deleteMany({}),
      placementDocs.deleteMany({}),
      promotionDocs.deleteMany({}),
    ]);
  },
};

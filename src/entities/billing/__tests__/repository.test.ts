import { beforeEach, describe, expect, it } from "vitest";
import { daysLeft, isFeatured, publicPlans } from "../lib";
import { billingRepository } from "../repository";
import { planEditSchema, promotionEditSchema } from "../schema";

const editFrom = (plan: {
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
}) => planEditSchema.parse(plan);

/**
 * The point of the billing repository is that the commercial offer is data:
 * Super Admin changes a price and the public page changes. These tests are
 * the contract behind that promise.
 */
describe("billingRepository", () => {
  beforeEach(async () => {
    await billingRepository._reset();
  });

  it("seeds three plans, one of them free", async () => {
    const plans = await billingRepository.listPlans();
    expect(plans).toHaveLength(3);
    expect(plans.filter((plan) => plan.priceMonthly === 0)).toHaveLength(1);
  });

  it("changes the public price without touching code", async () => {
    const before = await billingRepository.planById("plan_vip");
    expect(before).toBeDefined();
    if (!before) return;

    await billingRepository.updatePlan(
      "plan_vip",
      editFrom({ ...before, priceMonthly: 199_900 }),
    );

    const shown = publicPlans(await billingRepository.listPlans());
    expect(shown.find((plan) => plan.id === "plan_vip")?.priceMonthly).toBe(
      199_900,
    );
  });

  it("keeps at most one highlighted plan", async () => {
    const pro = await billingRepository.planById("plan_pro");
    expect(pro).toBeDefined();
    if (!pro) return;

    await billingRepository.updatePlan(
      "plan_pro",
      editFrom({ ...pro, highlighted: true }),
    );

    const highlighted = (await billingRepository.listPlans()).filter(
      (plan) => plan.highlighted,
    );
    expect(highlighted.map((plan) => plan.id)).toEqual(["plan_pro"]);
  });

  it("drops feature ids that are not in the catalogue", async () => {
    const basic = await billingRepository.planById("plan_basic");
    expect(basic).toBeDefined();
    if (!basic) return;

    const updated = await billingRepository.updatePlan(
      "plan_basic",
      editFrom({
        ...basic,
        featureIds: [...basic.featureIds, "not-a-feature"],
      }),
    );
    expect(updated?.featureIds).not.toContain("not-a-feature");
  });

  it("hides a deactivated plan from the public page but keeps it stored", async () => {
    const pro = await billingRepository.planById("plan_pro");
    if (!pro) return;
    await billingRepository.updatePlan(
      "plan_pro",
      editFrom({ ...pro, active: false }),
    );

    expect(
      publicPlans(await billingRepository.listPlans()).map((plan) => plan.id),
    ).not.toContain("plan_pro");
    expect(await billingRepository.planById("plan_pro")).toBeDefined();
  });

  it("returns null for an unknown plan instead of creating one", async () => {
    const basic = await billingRepository.planById("plan_basic");
    if (!basic) return;
    expect(
      await billingRepository.updatePlan("ghost", editFrom(basic)),
    ).toBeNull();
    expect(await billingRepository.listPlans()).toHaveLength(3);
  });

  describe("placements", () => {
    it("turns a day count into a feature window", async () => {
      const placement = await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_vip",
        featuredDays: 30,
        bannerDays: 0,
      });

      expect(isFeatured(placement)).toBe(true);
      expect(daysLeft(placement.featuredUntil)).toBe(30);
      expect(placement.bannerUntil).toBeNull();
    });

    it("clears a window when set to zero days", async () => {
      await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_vip",
        featuredDays: 30,
        bannerDays: 10,
      });
      const cleared = await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_basic",
        featuredDays: 0,
        bannerDays: 0,
      });

      expect(isFeatured(cleared)).toBe(false);
      expect(cleared.bannerUntil).toBeNull();
    });

    it("stores one row per club, overwriting rather than accumulating", async () => {
      await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_vip",
        featuredDays: 5,
        bannerDays: 0,
      });
      await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_pro",
        featuredDays: 5,
        bannerDays: 0,
      });

      const all = await billingRepository.listPlacements();
      expect(all.filter((item) => item.clubId === "club_1")).toHaveLength(1);
      expect((await billingRepository.placementFor("club_1"))?.planId).toBe(
        "plan_pro",
      );
    });

    it("ignores a blank banner headline rather than storing whitespace", async () => {
      const placement = await billingRepository.setPlacement({
        clubId: "club_1",
        planId: "plan_pro",
        featuredDays: 0,
        bannerDays: 7,
        bannerHeadline: "   ",
      });
      expect(placement.bannerHeadline).toBeUndefined();
    });
  });

  describe("promotions", () => {
    const edit = promotionEditSchema.parse({
      code: "STARTUA",
      description: "Перший місяць дешевше",
      percentOff: 30,
      expiresAt: null,
      active: true,
    });

    it("creates, then updates in place without resetting usage", async () => {
      const created = await billingRepository.savePromotion(null, edit);
      expect(created.usedCount).toBe(0);

      const updated = await billingRepository.savePromotion(created.id, {
        ...edit,
        percentOff: 40,
      });
      expect(updated.id).toBe(created.id);
      expect(updated.percentOff).toBe(40);
      expect(
        (await billingRepository.listPromotions()).filter(
          (promotion) => promotion.id === created.id,
        ),
      ).toHaveLength(1);
    });

    it("deletes by id and tolerates an unknown id", async () => {
      const created = await billingRepository.savePromotion(null, edit);
      await billingRepository.deletePromotion(created.id);
      await expect(
        billingRepository.deletePromotion("nope"),
      ).resolves.toBeUndefined();
      expect(
        (await billingRepository.listPromotions()).map(
          (promotion) => promotion.id,
        ),
      ).not.toContain(created.id);
    });

    it("rejects a lowercase code at the schema seam", () => {
      expect(
        promotionEditSchema.safeParse({ ...edit, code: "startua" }).success,
      ).toBe(false);
    });
  });
});

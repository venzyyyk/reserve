import { describe, expect, it } from "vitest";
import {
  addDays,
  daysLeft,
  discountedPrice,
  hasBanner,
  isFeatured,
  isPromotionUsable,
  publicPlans,
} from "../lib";
import type { Placement, Plan, Promotion } from "../model";

const plan = (over: Partial<Plan> = {}): Plan => ({
  id: "vip",
  tier: "vip",
  name: "VIP",
  tagline: "",
  priceMonthly: 149_000,
  commissionPercent: 5,
  featuredDays: 30,
  homepageBanner: false,
  priorityRecommendations: false,
  featureIds: [],
  active: true,
  highlighted: false,
  order: 2,
  ...over,
});

const promo = (over: Partial<Promotion> = {}): Promotion => ({
  id: "p1",
  code: "STARTUA",
  description: "",
  percentOff: 20,
  expiresAt: null,
  active: true,
  usedCount: 0,
  ...over,
});

describe("discountedPrice", () => {
  it("returns the full price when no promotion applies", () => {
    expect(discountedPrice(plan(), undefined).amount).toBe(149_000);
  });

  it("rounds to whole kopiykas so totals never carry a fraction", () => {
    const price = discountedPrice(
      plan({ priceMonthly: 33_333 }),
      promo({ percentOff: 33 }),
    );
    expect(Number.isSafeInteger(price.amount)).toBe(true);
    expect(price.amount).toBe(33_333 - Math.round((33_333 * 33) / 100));
  });

  it("ignores an unusable promotion", () => {
    expect(discountedPrice(plan(), promo({ active: false })).amount).toBe(
      149_000,
    );
  });

  it("never goes below zero", () => {
    expect(discountedPrice(plan(), promo({ percentOff: 100 })).amount).toBe(0);
  });
});

describe("isPromotionUsable", () => {
  it("rejects an expired code", () => {
    expect(isPromotionUsable(promo({ expiresAt: "2020-01-01" }))).toBe(false);
  });

  it("accepts an open-ended active code", () => {
    expect(isPromotionUsable(promo())).toBe(true);
  });
});

describe("placement windows", () => {
  const future = addDays(10);
  const past = addDays(-1);

  const placement = (over: Partial<Placement> = {}): Placement => ({
    clubId: "c1",
    planId: "vip",
    featuredUntil: null,
    bannerUntil: null,
    updatedAt: new Date().toISOString(),
    ...over,
  });

  it("treats a lapsed window as not featured", () => {
    expect(isFeatured(placement({ featuredUntil: past }))).toBe(false);
    expect(isFeatured(placement({ featuredUntil: future }))).toBe(true);
  });

  it("treats a missing placement as plain", () => {
    expect(isFeatured(undefined)).toBe(false);
    expect(hasBanner(undefined)).toBe(false);
  });

  it("reports remaining days without going negative", () => {
    expect(daysLeft(past)).toBe(0);
    expect(daysLeft(null)).toBe(0);
    expect(daysLeft(future)).toBeGreaterThan(0);
  });
});

describe("publicPlans", () => {
  it("hides inactive plans and sorts by order", () => {
    const result = publicPlans([
      plan({ id: "pro", order: 3 }),
      plan({ id: "hidden", active: false, order: 1 }),
      plan({ id: "basic", order: 1 }),
    ]);
    expect(result.map((item) => item.id)).toEqual(["basic", "pro"]);
  });
});

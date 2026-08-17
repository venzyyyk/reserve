import { uah, type Money } from "@/shared/lib/money";
import type { Placement, Plan, Promotion } from "./model";

/** Monthly price as Money; 0 renders as "Безкоштовно" by the caller. */
export function planPrice(plan: Plan): Money {
  return uah(plan.priceMonthly);
}

/**
 * Price after a promotion, rounded to whole kopiykas.
 *
 * An absent, inactive or expired code is not an error — it just means the
 * list price stands, so callers can pass whatever they found without
 * branching first.
 */
export function discountedPrice(
  plan: Plan,
  promotion: Promotion | undefined,
  now: Date = new Date(),
): Money {
  if (!promotion || !isPromotionUsable(promotion, now)) {
    return uah(plan.priceMonthly);
  }
  const off = Math.round((plan.priceMonthly * promotion.percentOff) / 100);
  return uah(Math.max(0, plan.priceMonthly - off));
}

export function isPromotionUsable(
  promotion: Promotion,
  now: Date = new Date(),
): boolean {
  if (!promotion.active) return false;
  if (!promotion.expiresAt) return true;
  // Expiry is a date, and a code valid "until 31 серпня" works all that day.
  return Date.parse(`${promotion.expiresAt}T23:59:59Z`) >= now.getTime();
}

export function isFeatured(
  placement: Placement | undefined,
  now: Date = new Date(),
): boolean {
  if (!placement?.featuredUntil) return false;
  return Date.parse(placement.featuredUntil) > now.getTime();
}

export function hasBanner(
  placement: Placement | undefined,
  now: Date = new Date(),
): boolean {
  if (!placement?.bannerUntil) return false;
  return Date.parse(placement.bannerUntil) > now.getTime();
}

/** Whole days left, for the admin table. 0 when lapsed or unset. */
export function daysLeft(until: string | null, now: Date = new Date()): number {
  if (!until) return 0;
  const ms = Date.parse(until) - now.getTime();
  return ms <= 0 ? 0 : Math.ceil(ms / 86_400_000);
}

export function addDays(days: number, from: Date = new Date()): string {
  return new Date(from.getTime() + days * 86_400_000).toISOString();
}

/** Sort for the public pricing section: order first, tier as a tiebreak. */
export function publicPlans(plans: readonly Plan[]): Plan[] {
  return plans.filter((plan) => plan.active).sort((a, b) => a.order - b.order);
}

/**
 * Feature flags (MPS §8): config-based at launch, overridable per
 * environment via NEXT_PUBLIC_FLAGS='{"favoritesTab":true}'.
 *
 * Deliberately dependency-free: flags are read by client components
 * (e.g. the mobile tab bar), so pulling Zod in here would ship a validation
 * runtime to every public page for four booleans.
 */
export interface Flags {
  /** Tab bar composition is flag-driven — never show a dead tab (MPS §2). */
  favoritesTab: boolean;
  tournamentsTab: boolean;
  /**
   * Online booking. Shipped in M2a — club pages now lead to the flow.
   * Kept as a flag so a club-side incident can fall back to phone booking
   * without a deploy.
   */
  onlineBooking: boolean;
  /** Admin plan⇄timeline sync fallback (MPS risk register). */
  adminTimelineSync: boolean;
}

const DEFAULTS: Flags = {
  favoritesTab: false,
  tournamentsTab: false,
  onlineBooking: true,
  adminTimelineSync: true,
};

function resolveFlags(): Flags {
  const raw = process.env.NEXT_PUBLIC_FLAGS;
  if (!raw) return DEFAULTS;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_FLAGS is not valid JSON");
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw new Error("NEXT_PUBLIC_FLAGS must be a JSON object");
  }

  const overrides = parsed as Record<string, unknown>;
  const result = { ...DEFAULTS };
  for (const key of Object.keys(DEFAULTS) as (keyof Flags)[]) {
    const value = overrides[key];
    if (value === undefined) continue;
    if (typeof value !== "boolean") {
      throw new Error(`NEXT_PUBLIC_FLAGS.${key} must be a boolean`);
    }
    result[key] = value;
  }
  return result;
}

export const flags: Flags = resolveFlags();

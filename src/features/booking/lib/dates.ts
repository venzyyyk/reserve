import type { IsoDate } from "@/entities/booking";

/** Today in Kyiv as an ISO date — the club's day, not the device's. */
export function todayIso(now: Date = new Date()): IsoDate {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** The 14-day strip offered in the flow (MPS §4). */
export function dateStrip(from: IsoDate, length = 14): IsoDate[] {
  return Array.from({ length }, (_, i) => addDays(from, i));
}

export function dayNumber(date: IsoDate): string {
  return String(new Date(`${date}T00:00:00Z`).getUTCDate());
}

/** Minutes since midnight, Kyiv — used to hide slots already in the past. */
export function minutesNowInKyiv(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Kyiv",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const lookup = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return Number(lookup.hour ?? 0) * 60 + Number(lookup.minute ?? 0);
}

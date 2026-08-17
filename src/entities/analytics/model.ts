/**
 * What the platform counts, and why each one is counted.
 *
 * This is deliberately a short list. Every event here answers a question
 * somebody will actually ask — three of them are the questions that decide
 * whether a club pays us:
 *
 *   club_viewed     "how many people looked at my club?"
 *   booking_started "how many of them tried to book?"
 *   booking_paid    "how many actually came?"
 *
 * The fourth is the one nobody thinks to collect and everybody wishes they
 * had: `search_empty` records a visitor who searched and found nothing.
 * That is a list of cities and table types with demand and no supply —
 * which is to say, a call list.
 */
export type EventName =
  "club_viewed" | "booking_started" | "booking_paid" | "search_empty";

export interface AnalyticsEvent {
  name: EventName;
  /** ISO instant. */
  at: string;
  /** Which club it concerns, where that makes sense. */
  clubId?: string;
  /** The anonymous browser session, so views can be counted per person. */
  sessionId?: string;
  /** Where the visitor came from, captured once and carried forward. */
  source?: string;
  /** Free-form detail: the city searched, the filters that found nothing. */
  detail?: string;
  /** Kopiykas, on paid bookings — so revenue is a sum, not a join. */
  amount?: number;
  /**
   * Makes an event countable exactly once.
   *
   * The payment status endpoint is polled, and settlement is idempotent, so
   * every poll after the first would report the same paid booking again.
   * A key of `booking_paid:<id>` lets the store reject the repeats: the
   * database decides, rather than the caller remembering.
   */
  dedupeKey?: string;
}

/** A day's counts for one club, which is what the club is shown. */
export interface DailyCount {
  date: string;
  count: number;
}

export interface ClubFunnel {
  clubId: string;
  viewed: number;
  started: number;
  paid: number;
  revenue: number;
}

export interface SourceCount {
  source: string;
  count: number;
}

export interface EmptySearch {
  detail: string;
  count: number;
  lastAt: string;
}

/**
 * Views to paid bookings, as a percentage with one decimal.
 *
 * Returns null rather than 0 when nothing has been viewed yet: "0%" reads
 * as a bad result, and "no data" is a different statement.
 */
export function conversionRate(funnel: {
  viewed: number;
  paid: number;
}): number | null {
  if (funnel.viewed === 0) return null;
  return Math.round((funnel.paid / funnel.viewed) * 1000) / 10;
}

/** UTM is what most links carry; anything else is recorded as it arrived. */
export function readSource(params: URLSearchParams): string | undefined {
  const utm = params.get("utm_source")?.trim();
  if (utm) {
    const medium = params.get("utm_medium")?.trim();
    return medium ? `${utm} / ${medium}` : utm;
  }
  return undefined;
}

/** The window the admin screens report on. Days, because a month is noise. */
export const REPORT_DAYS = 30;

export function sinceIso(days: number, now: Date = new Date()): string {
  return new Date(now.getTime() - days * 86_400_000).toISOString();
}

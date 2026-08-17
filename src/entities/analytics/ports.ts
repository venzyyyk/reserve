import type {
  AnalyticsEvent,
  ClubFunnel,
  DailyCount,
  EmptySearch,
  SourceCount,
} from "./model";

/**
 * Recording is fire-and-forget by contract: a counter must never be able to
 * fail a booking. Reading is deliberately narrow — five questions, five
 * methods, no general query interface that would let a screen invent its
 * own analysis and then need a new index.
 */
export interface AnalyticsRepository {
  record(event: AnalyticsEvent): Promise<void>;

  /** The whole funnel, per club, over a window. */
  funnels(sinceIso: string): Promise<ClubFunnel[]>;

  /** One club's daily views — what a club owner is shown. */
  dailyViews(clubId: string, sinceIso: string): Promise<DailyCount[]>;

  /** Where visitors came from. */
  sources(sinceIso: string): Promise<SourceCount[]>;

  /** Searches that found nothing, most wanted first. */
  emptySearches(sinceIso: string, limit: number): Promise<EmptySearch[]>;

  _reset(): Promise<void>;
}

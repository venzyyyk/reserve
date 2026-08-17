export {
  conversionRate,
  readSource,
  sinceIso,
  REPORT_DAYS,
  type AnalyticsEvent,
  type ClubFunnel,
  type DailyCount,
  type EmptySearch,
  type EventName,
  type SourceCount,
} from "./model";

export { recordEvent } from "./repository";

/**
 * The source a visitor arrived with, as carried in their cookie.
 *
 * Read at the moments that matter commercially — a started booking, a paid
 * one — so attribution survives the several pages between the campaign link
 * and the payment.
 */
export function sourceFromCookie(cookie: string | null): string | undefined {
  const match = cookie?.match(/(?:^|;\s*)rsv_src=([^;]*)/);
  return match?.[1] ? decodeURIComponent(match[1]) : undefined;
}

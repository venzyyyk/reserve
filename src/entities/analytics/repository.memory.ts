import "server-only";

import { processStore } from "@/shared/lib/process-store";
import type { AnalyticsEvent, ClubFunnel } from "./model";
import type { AnalyticsRepository } from "./ports";

/**
 * In-memory analytics, for development and the fast test suite. It answers
 * the same five questions as the MongoDB adapter so the admin screens can
 * be built and tested without a database.
 */
const log = processStore("analytics.events", () => [] as AnalyticsEvent[]);
const counted = processStore("analytics.dedupe", () => new Set<string>());

const within = (event: AnalyticsEvent, sinceIso: string): boolean =>
  event.at >= sinceIso;

/** Kyiv day, matching the timezone the MongoDB aggregation groups by. */
const kyivDay = (iso: string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Kyiv",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));

export const memoryAnalyticsRepository: AnalyticsRepository = {
  async record(event) {
    if (event.dedupeKey !== undefined) {
      if (counted.has(event.dedupeKey)) return;
      counted.add(event.dedupeKey);
    }
    log.push(event);
  },

  async funnels(sinceIso) {
    const byClub = new Map<string, ClubFunnel>();

    for (const event of log) {
      if (!within(event, sinceIso) || !event.clubId) continue;
      const funnel = byClub.get(event.clubId) ?? {
        clubId: event.clubId,
        viewed: 0,
        started: 0,
        paid: 0,
        revenue: 0,
      };

      if (event.name === "club_viewed") funnel.viewed += 1;
      if (event.name === "booking_started") funnel.started += 1;
      if (event.name === "booking_paid") {
        funnel.paid += 1;
        funnel.revenue += event.amount ?? 0;
      }
      byClub.set(event.clubId, funnel);
    }

    return [...byClub.values()].sort((a, b) => b.viewed - a.viewed);
  },

  async dailyViews(clubId, sinceIso) {
    const byDay = new Map<string, number>();
    for (const event of log) {
      if (event.name !== "club_viewed") continue;
      if (event.clubId !== clubId || !within(event, sinceIso)) continue;
      const day = kyivDay(event.at);
      byDay.set(day, (byDay.get(day) ?? 0) + 1);
    }
    return [...byDay.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  },

  async sources(sinceIso) {
    const counts = new Map<string, number>();
    for (const event of log) {
      if (!within(event, sinceIso) || !event.source) continue;
      counts.set(event.source, (counts.get(event.source) ?? 0) + 1);
    }
    return [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);
  },

  async emptySearches(sinceIso, limit) {
    const counts = new Map<string, { count: number; lastAt: string }>();
    for (const event of log) {
      if (event.name !== "search_empty" || !within(event, sinceIso)) continue;
      const key = event.detail ?? "—";
      const current = counts.get(key) ?? { count: 0, lastAt: event.at };
      counts.set(key, {
        count: current.count + 1,
        lastAt: event.at > current.lastAt ? event.at : current.lastAt,
      });
    }
    return [...counts.entries()]
      .map(([detail, value]) => ({ detail, ...value }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  },

  async _reset() {
    log.length = 0;
    counted.clear();
  },
};

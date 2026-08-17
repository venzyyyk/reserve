import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type {
  AnalyticsEvent,
  ClubFunnel,
  DailyCount,
  EmptySearch,
  SourceCount,
} from "./model";
import type { AnalyticsRepository } from "./ports";

/**
 * MongoDB analytics adapter.
 *
 * Raw events, aggregated on read. At the volume a marketplace with a few
 * dozen clubs produces, a `$match` over an indexed month is milliseconds,
 * and pre-computed rollups would be a second source of truth to keep
 * correct for no gain. When a month of events stops being cheap to scan,
 * that is the signal to add them — not before.
 */
interface EventDoc {
  name: AnalyticsEvent["name"];
  at: Date;
  clubId?: string;
  sessionId?: string;
  source?: string;
  detail?: string;
  amount?: number;
  dedupeKey?: string;
}

const events = () => collection<EventDoc>(COLLECTIONS.events);

export const mongoAnalyticsRepository: AnalyticsRepository = {
  async record(event: AnalyticsEvent) {
    const documents = await events();
    try {
      await documents.insertOne({
        name: event.name,
        at: new Date(event.at),
        ...(event.clubId !== undefined && { clubId: event.clubId }),
        ...(event.sessionId !== undefined && { sessionId: event.sessionId }),
        ...(event.source !== undefined && { source: event.source }),
        ...(event.detail !== undefined && { detail: event.detail }),
        ...(event.amount !== undefined && { amount: event.amount }),
        ...(event.dedupeKey !== undefined && { dedupeKey: event.dedupeKey }),
      });
    } catch (error) {
      // A duplicate key means this event was already counted, which is the
      // point of having one. Anything else is a real failure.
      const code = (error as { code?: unknown }).code;
      if (code !== 11000) throw error;
    }
  },

  async funnels(sinceIso: string): Promise<ClubFunnel[]> {
    const documents = await events();
    const rows = await documents
      .aggregate<{
        _id: string;
        viewed: number;
        started: number;
        paid: number;
        revenue: number;
      }>([
        {
          $match: {
            at: { $gte: new Date(sinceIso) },
            clubId: { $exists: true },
            name: { $in: ["club_viewed", "booking_started", "booking_paid"] },
          },
        },
        {
          $group: {
            _id: "$clubId",
            viewed: {
              $sum: { $cond: [{ $eq: ["$name", "club_viewed"] }, 1, 0] },
            },
            started: {
              $sum: { $cond: [{ $eq: ["$name", "booking_started"] }, 1, 0] },
            },
            paid: {
              $sum: { $cond: [{ $eq: ["$name", "booking_paid"] }, 1, 0] },
            },
            revenue: {
              $sum: {
                $cond: [
                  { $eq: ["$name", "booking_paid"] },
                  { $ifNull: ["$amount", 0] },
                  0,
                ],
              },
            },
          },
        },
        { $sort: { viewed: -1 } },
      ])
      .toArray();

    return rows.map((row) => ({
      clubId: row._id,
      viewed: row.viewed,
      started: row.started,
      paid: row.paid,
      revenue: row.revenue,
    }));
  },

  async dailyViews(clubId: string, sinceIso: string): Promise<DailyCount[]> {
    const documents = await events();
    const rows = await documents
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            name: "club_viewed",
            clubId,
            at: { $gte: new Date(sinceIso) },
          },
        },
        {
          $group: {
            _id: {
              // Grouped in Kyiv time: a club's day ends when it closes, not
              // when UTC rolls over.
              $dateToString: {
                format: "%Y-%m-%d",
                date: "$at",
                timezone: "Europe/Kyiv",
              },
            },
            count: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ])
      .toArray();

    return rows.map((row) => ({ date: row._id, count: row.count }));
  },

  async sources(sinceIso: string): Promise<SourceCount[]> {
    const documents = await events();
    const rows = await documents
      .aggregate<{ _id: string; count: number }>([
        {
          $match: {
            at: { $gte: new Date(sinceIso) },
            source: { $exists: true, $ne: null },
          },
        },
        { $group: { _id: "$source", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ])
      .toArray();

    return rows.map((row) => ({ source: row._id, count: row.count }));
  },

  async emptySearches(sinceIso: string, limit: number): Promise<EmptySearch[]> {
    const documents = await events();
    const rows = await documents
      .aggregate<{ _id: string; count: number; lastAt: Date }>([
        { $match: { name: "search_empty", at: { $gte: new Date(sinceIso) } } },
        {
          $group: {
            _id: { $ifNull: ["$detail", "—"] },
            count: { $sum: 1 },
            lastAt: { $max: "$at" },
          },
        },
        { $sort: { count: -1 } },
        { $limit: limit },
      ])
      .toArray();

    return rows.map((row) => ({
      detail: row._id,
      count: row.count,
      lastAt: row.lastAt.toISOString(),
    }));
  },

  async _reset() {
    const documents = await events();
    await documents.deleteMany({});
  },
};

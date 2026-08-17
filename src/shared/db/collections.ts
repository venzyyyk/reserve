import "server-only";

import type { Collection, Document } from "mongodb";
import { mongoDb } from "./client";
import { processStore } from "@/shared/lib/process-store";

/**
 * Collection names and their indexes, in one place.
 *
 * Every index below exists because a query in this repository uses it —
 * the list was written from the queries, not from a checklist. Where a
 * collection is small and only ever read whole (billing plans, features)
 * there is no index beyond `_id`, because an index that is never used
 * still costs every write.
 */
export const COLLECTIONS = {
  bookings: "bookings",
  bookingHolds: "bookingHolds",
  /** Occupancy ledger and concurrency guard — see ADR-0009. */
  tableDays: "tableDays",
  payments: "payments",
  billingPlans: "billingPlans",
  billingFeatures: "billingFeatures",
  placements: "placements",
  promotions: "promotions",
  clubApplications: "clubApplications",
  reviews: "reviews",
  users: "users",
  /** Clubs, editable from the admin panel since M6. */
  clubs: "clubs",
  /** Raw analytics events, aggregated on read (M5). */
  events: "events",
} as const;

export async function collection<T extends Document>(
  name: (typeof COLLECTIONS)[keyof typeof COLLECTIONS],
): Promise<Collection<T>> {
  const db = await mongoDb();
  return db.collection<T>(name);
}

/**
 * Creates indexes once per process.
 *
 * `createIndex` is idempotent, so this is safe to call on every boot; the
 * guard is only to avoid eleven round trips per request. Index creation is
 * deliberately not part of `mongoDb()` — a read path should not be able to
 * trigger DDL.
 */
export async function ensureIndexes(): Promise<void> {
  const state = processStore("mongo.indexes", () => ({
    done: undefined as Promise<void> | undefined,
  }));

  state.done ??= createIndexes().catch((error: unknown) => {
    state.done = undefined;
    throw error;
  });
  return state.done;
}

async function createIndexes(): Promise<void> {
  const db = await mongoDb();

  await Promise.all([
    // Availability reads one document per table for a club and date.
    db
      .collection(COLLECTIONS.tableDays)
      .createIndex({ clubId: 1, date: 1 }, { name: "occupancy_by_club_day" }),

    // Bookings are looked up by their own id (`id`, not `_id`, so the
    // domain object stays free of ObjectId), and listed for a club's day.
    db
      .collection(COLLECTIONS.bookings)
      .createIndex({ id: 1 }, { unique: true, name: "booking_id" }),
    db
      .collection(COLLECTIONS.bookings)
      .createIndex(
        { clubId: 1, date: 1, status: 1 },
        { name: "bookings_by_club_day_status" },
      ),
    // The duplicate-submit path: which booking a hold already became.
    db.collection(COLLECTIONS.bookings).createIndex(
      { holdId: 1 },
      {
        unique: true,
        sparse: true,
        name: "booking_per_hold",
      },
    ),
    db
      .collection(COLLECTIONS.bookings)
      .createIndex(
        { paymentId: 1 },
        { sparse: true, name: "bookings_by_payment" },
      ),

    // Holds: fetched by id, deduplicated by idempotency key, and swept by
    // expiry. The TTL is cleanup only — every read still checks `expiresAt`
    // itself, because TTL deletion runs on a timer and correctness cannot
    // wait for it (ADR-0009).
    db
      .collection(COLLECTIONS.bookingHolds)
      .createIndex({ id: 1 }, { unique: true, name: "hold_id" }),
    db
      .collection(COLLECTIONS.bookingHolds)
      .createIndex(
        { idempotencyKey: 1 },
        { unique: true, name: "hold_idempotency" },
      ),
    db.collection(COLLECTIONS.bookingHolds).createIndex(
      { expiresAt: 1 },
      {
        // Kept an hour past expiry so a late payment can still explain
        // itself instead of finding nothing.
        expireAfterSeconds: 3600,
        name: "hold_ttl",
      },
    ),

    // Payments are read by id on the polling path and by booking id when
    // resuming an interrupted checkout.
    db
      .collection(COLLECTIONS.payments)
      .createIndex({ id: 1 }, { unique: true, name: "payment_id" }),
    db
      .collection(COLLECTIONS.payments)
      .createIndex({ bookingId: 1 }, { name: "payments_by_booking" }),
    db
      .collection(COLLECTIONS.payments)
      .createIndex(
        { providerRef: 1 },
        { sparse: true, name: "payments_by_provider_ref" },
      ),

    // One placement per club; the admin overview counts live windows.
    db
      .collection(COLLECTIONS.placements)
      .createIndex({ clubId: 1 }, { unique: true, name: "placement_per_club" }),
    db
      .collection(COLLECTIONS.placements)
      .createIndex({ featuredUntil: 1 }, { name: "placements_by_featured" }),

    db
      .collection(COLLECTIONS.billingPlans)
      .createIndex({ id: 1 }, { unique: true, name: "plan_id" }),
    db
      .collection(COLLECTIONS.promotions)
      .createIndex({ id: 1 }, { unique: true, name: "promotion_id" }),
    db
      .collection(COLLECTIONS.promotions)
      .createIndex({ code: 1 }, { unique: true, name: "promotion_code" }),

    // The queue screens read by status, newest first.
    db
      .collection(COLLECTIONS.clubApplications)
      .createIndex({ id: 1 }, { unique: true, name: "application_id" }),
    db
      .collection(COLLECTIONS.clubApplications)
      .createIndex(
        { status: 1, createdAt: -1 },
        { name: "applications_by_status" },
      ),

    db
      .collection(COLLECTIONS.reviews)
      .createIndex({ id: 1 }, { unique: true, name: "review_id" }),
    db
      .collection(COLLECTIONS.reviews)
      .createIndex(
        { clubId: 1, status: 1, createdAt: -1 },
        { name: "reviews_by_club_status" },
      ),
    // One review per booking, enforced by the database rather than by a
    // read-then-write that two submits could interleave.
    db
      .collection(COLLECTIONS.reviews)
      .createIndex(
        { bookingId: 1 },
        { unique: true, sparse: true, name: "review_per_booking" },
      ),

    db
      .collection(COLLECTIONS.users)
      .createIndex({ id: 1 }, { unique: true, name: "user_id" }),
    db
      .collection(COLLECTIONS.users)
      .createIndex({ phone: 1 }, { unique: true, name: "user_phone" }),

    // The catalogue reads by city and by slug; the booking flow reads by id.
    db
      .collection(COLLECTIONS.clubs)
      .createIndex({ id: 1 }, { unique: true, name: "club_id" }),
    db
      .collection(COLLECTIONS.clubs)
      .createIndex(
        { city: 1, slug: 1 },
        { unique: true, name: "club_city_slug" },
      ),
    db
      .collection(COLLECTIONS.clubs)
      .createIndex({ published: 1, city: 1 }, { name: "clubs_by_city" }),

    // Analytics. Every report filters by time first, so `at` leads every
    // key; the club index carries the funnel and the daily views.
    db
      .collection(COLLECTIONS.events)
      .createIndex({ name: 1, at: -1 }, { name: "events_by_name_time" }),
    db
      .collection(COLLECTIONS.events)
      .createIndex(
        { clubId: 1, name: 1, at: -1 },
        { sparse: true, name: "events_by_club" },
      ),
    // Counts an event once even when the caller retries — see the payment
    // polling path.
    db
      .collection(COLLECTIONS.events)
      .createIndex(
        { dedupeKey: 1 },
        { unique: true, sparse: true, name: "event_dedupe" },
      ),
    // Raw events are working memory, not an archive: six months is longer
    // than any question anyone asks of them, and keeping more would grow
    // without ever being read.
    db
      .collection(COLLECTIONS.events)
      .createIndex(
        { at: 1 },
        { expireAfterSeconds: 180 * 86_400, name: "events_ttl" },
      ),
  ]);
}

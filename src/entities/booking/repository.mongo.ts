import "server-only";

import { clubRepository } from "@/entities/club/repository";
import { COLLECTIONS, collection } from "@/shared/db/collections";
import {
  CONFIRMED_UNTIL,
  claimRange,
  clearLedger,
  occupancyFor,
  pruneExpired,
  releaseClaim,
  retagClaim,
} from "./occupancy-ledger";
import { isRangeFree, priceFor, tableById } from "./lib";
import {
  HOLD_TTL_MS,
  PAYMENT_WINDOW_MS,
  type Booking,
  type BookingStatus,
  type Hold,
  type Occupancy,
} from "./model";
import type { BookingRepository, CreateHoldInput, HoldResult } from "./ports";

/**
 * MongoDB booking adapter (M2b).
 *
 * The in-memory adapter serialised everything through one process-wide
 * mutex. That is not available here and, more to the point, was never
 * enough: a second server instance has its own mutex. Mutual exclusion now
 * comes from the occupancy ledger, where a claim is one atomic document
 * update (ADR-0009). Everything else in this file is bookkeeping around
 * that single guarantee.
 *
 * Write order is always **claim first, record second**. A crash in between
 * leaves a claim whose owner does not exist, and it expires on its own. The
 * opposite order would leave a booking nothing is holding, which is how
 * tables get sold twice.
 */

/** Stored shape. Domain objects never carry `_id` or Date instances. */
interface BookingDoc {
  id: string;
  reference: string;
  clubId: string;
  tableId: string;
  date: string;
  start: number;
  end: number;
  /** Denormalised from start/end so reporting does not recompute it. */
  durationMinutes: number;
  status: BookingStatus;
  total: number;
  currency: "UAH";
  phone: string;
  /** The browser that booked — how a guest finds their own ticket again. */
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
  paymentId?: string;
  refundRequired?: boolean;
  /** Which hold became this booking — the duplicate-submit path. */
  holdId: string;
}

interface HoldDoc {
  id: string;
  clubId: string;
  tableId: string;
  date: string;
  start: number;
  end: number;
  sessionId: string;
  idempotencyKey: string;
  expiresAt: Date;
  createdAt: Date;
}

const bookingsCollection = () => collection<BookingDoc>(COLLECTIONS.bookings);
const holdsCollection = () => collection<HoldDoc>(COLLECTIONS.bookingHolds);

function toBooking(doc: BookingDoc): Booking {
  return {
    id: doc.id,
    reference: doc.reference,
    clubId: doc.clubId,
    tableId: doc.tableId,
    date: doc.date,
    start: doc.start,
    end: doc.end,
    status: doc.status,
    total: doc.total,
    phone: doc.phone,
    sessionId: doc.sessionId,
    createdAt: doc.createdAt.toISOString(),
    ...(doc.expiresAt && { expiresAt: doc.expiresAt.toISOString() }),
    ...(doc.paymentId !== undefined && { paymentId: doc.paymentId }),
    ...(doc.refundRequired === true && { refundRequired: true }),
  };
}

function toHold(doc: HoldDoc): Hold {
  return {
    id: doc.id,
    clubId: doc.clubId,
    tableId: doc.tableId,
    date: doc.date,
    start: doc.start,
    end: doc.end,
    sessionId: doc.sessionId,
    expiresAt: doc.expiresAt.toISOString(),
  };
}

function reference(): string {
  const alphabet = "ACEFHJKLMNPRTUVWXY3479";
  let out = "";
  for (let index = 0; index < 4; index += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RSV-${out}`;
}

/**
 * A booking awaiting payment past its window is expired, whether or not
 * anything has written that down yet. The in-memory adapter swept on every
 * read; here the fact is derived on read and persisted opportunistically,
 * so a crash cannot leave a booking that looks live forever.
 */
async function settleExpiry(doc: BookingDoc, now: Date): Promise<BookingDoc> {
  const lapsed =
    doc.status === "awaiting_payment" &&
    doc.expiresAt !== undefined &&
    doc.expiresAt <= now;
  if (!lapsed) return doc;

  const bookings = await bookingsCollection();
  await bookings.updateOne(
    { id: doc.id, status: "awaiting_payment" },
    { $set: { status: "expired", updatedAt: now } },
  );
  return { ...doc, status: "expired" };
}

export const mongoBookingRepository: BookingRepository = {
  async occupancyFor(clubId: string, date: string): Promise<Occupancy[]> {
    return occupancyFor(clubId, date, new Date());
  },

  async hold(input: CreateHoldInput): Promise<HoldResult> {
    const holds = await holdsCollection();
    const now = new Date();

    const club = await clubRepository.byId(input.clubId);
    if (!club) return { ok: false, reason: "unknown_table" };
    const table = tableById(club, input.tableId);
    if (!table) return { ok: false, reason: "unknown_table" };

    const total = priceFor(table, input.end - input.start).amount;
    const range = { start: input.start, end: input.end };

    /** A retry of the same request must return the original hold. */
    const existing = await holds.findOne({
      idempotencyKey: input.idempotencyKey,
    });
    if (existing && existing.expiresAt > now) {
      return { ok: true, hold: toHold(existing), total };
    }

    // Opening hours are a property of the club, not of who booked first, so
    // they are checked before touching the ledger. This is also what lets
    // the failure say "closed" rather than a blank "taken".
    if (!isRangeFree(club, input.date, input.tableId, range, [])) {
      return { ok: false, reason: "closed" };
    }

    const hold: HoldDoc = {
      id: crypto.randomUUID(),
      clubId: input.clubId,
      tableId: input.tableId,
      date: input.date,
      start: input.start,
      end: input.end,
      sessionId: input.sessionId,
      idempotencyKey: input.idempotencyKey,
      expiresAt: new Date(now.getTime() + HOLD_TTL_MS),
      createdAt: now,
    };

    const claimed = await claimRange({
      clubId: input.clubId,
      tableId: input.tableId,
      date: input.date,
      start: input.start,
      end: input.end,
      ref: hold.id,
      kind: "hold",
      until: hold.expiresAt,
      now,
    });

    if (!claimed) {
      // Lost the race — unless the winner was this same request arriving
      // twice, in which case the caller still deserves its hold back.
      const twin = await holds.findOne({
        idempotencyKey: input.idempotencyKey,
      });
      if (twin && twin.expiresAt > now) {
        return { ok: true, hold: toHold(twin), total };
      }
      return { ok: false, reason: "taken" };
    }

    try {
      await holds.insertOne(hold);
    } catch (error) {
      // The unique index on idempotencyKey is the last word on duplicates.
      await releaseClaim({ ...input, ref: hold.id });
      const twin = await holds.findOne({
        idempotencyKey: input.idempotencyKey,
      });
      if (twin && twin.expiresAt > now) {
        return { ok: true, hold: toHold(twin), total };
      }
      throw error;
    }

    return { ok: true, hold: toHold(hold), total };
  },

  async release(holdId: string): Promise<void> {
    const holds = await holdsCollection();
    const hold = await holds.findOne({ id: holdId });
    if (!hold) return;
    await releaseClaim({
      clubId: hold.clubId,
      tableId: hold.tableId,
      date: hold.date,
      ref: hold.id,
    });
    await holds.deleteOne({ id: holdId });
  },

  async getHold(holdId: string): Promise<Hold | undefined> {
    const holds = await holdsCollection();
    const hold = await holds.findOne({ id: holdId });
    if (!hold || hold.expiresAt <= new Date()) return undefined;
    return toHold(hold);
  },

  async reserveForPayment(
    holdId: string,
    phone: string,
  ): Promise<Booking | null> {
    const holds = await holdsCollection();
    const bookings = await bookingsCollection();
    const now = new Date();

    const hold = await holds.findOne({ id: holdId });
    if (!hold || hold.expiresAt <= now) return null;

    const club = await clubRepository.byId(hold.clubId);
    const table = club && tableById(club, hold.tableId);
    if (!table) return null;

    const bookingId = crypto.randomUUID();
    // A fresh window: the hold's leftover seconds must not decide whether a
    // payment in flight keeps its table.
    const expiresAt = new Date(now.getTime() + PAYMENT_WINDOW_MS);

    // The claim is transferred before the booking exists. If this process
    // dies now, the slot is held by an id nothing points at and frees itself
    // when the payment window closes.
    const moved = await retagClaim({
      clubId: hold.clubId,
      tableId: hold.tableId,
      date: hold.date,
      ref: hold.id,
      newRef: bookingId,
      kind: "awaiting_payment",
      until: expiresAt,
      now,
    });
    if (!moved) return null;

    const doc: BookingDoc = {
      id: bookingId,
      reference: reference(),
      clubId: hold.clubId,
      tableId: hold.tableId,
      date: hold.date,
      start: hold.start,
      end: hold.end,
      durationMinutes: hold.end - hold.start,
      status: "awaiting_payment",
      total: priceFor(table, hold.end - hold.start).amount,
      currency: "UAH",
      phone,
      sessionId: hold.sessionId,
      createdAt: now,
      updatedAt: now,
      expiresAt,
      holdId: hold.id,
    };

    try {
      await bookings.insertOne(doc);
    } catch (error) {
      // Unique on holdId: this hold already became a booking. Hand back the
      // original rather than starting a second payment for one table.
      const twin = await bookings.findOne({ holdId: hold.id });
      if (twin) return toBooking(twin);
      throw error;
    }

    await holds.deleteOne({ id: hold.id });
    return toBooking(doc);
  },

  async markPaid(bookingId: string): Promise<Booking | null> {
    const bookings = await bookingsCollection();
    const now = new Date();

    const doc = await bookings.findOne({ id: bookingId });
    if (!doc) return null;
    if (doc.status === "confirmed") return toBooking(doc);
    if (doc.status === "cancelled") return toBooking(doc);

    const lapsed =
      doc.status === "expired" ||
      (doc.expiresAt !== undefined && doc.expiresAt <= now);

    if (!lapsed) {
      // The claim is still live, so by the ledger's own invariant nothing
      // else can be overlapping it. Promote it in place.
      const promoted = await retagClaim({
        clubId: doc.clubId,
        tableId: doc.tableId,
        date: doc.date,
        ref: doc.id,
        kind: "confirmed",
        until: CONFIRMED_UNTIL,
        now,
      });
      if (promoted) return confirm(doc, now);
    }

    // Late settlement. The expired claim was protecting nothing, so drop it
    // and try to take the slot again on equal terms. Winning means the table
    // was still free and the guest gets what they paid for; losing means
    // someone else booked it and we owe a refund rather than a second
    // ticket for the same table.
    await releaseClaim({
      clubId: doc.clubId,
      tableId: doc.tableId,
      date: doc.date,
      ref: doc.id,
    });

    const club = await clubRepository.byId(doc.clubId);
    const stillOpen =
      club !== undefined &&
      isRangeFree(
        club,
        doc.date,
        doc.tableId,
        { start: doc.start, end: doc.end },
        [],
      );

    const reclaimed =
      stillOpen &&
      (await claimRange({
        clubId: doc.clubId,
        tableId: doc.tableId,
        date: doc.date,
        start: doc.start,
        end: doc.end,
        ref: doc.id,
        kind: "confirmed",
        until: CONFIRMED_UNTIL,
        now,
      }));

    if (reclaimed) return confirm(doc, now);

    // Losing the slot is only *this* callback's conclusion. If a duplicate
    // of it already confirmed the booking, that outcome stands: the status
    // guard in the filter is what makes two webhooks agree on one answer
    // instead of the later one overwriting the earlier.
    const cancelled = await bookings.findOneAndUpdate(
      { id: doc.id, status: { $in: ["awaiting_payment", "expired"] } },
      {
        $set: { status: "cancelled", refundRequired: true, updatedAt: now },
        $unset: { expiresAt: "" },
      },
      { returnDocument: "after" },
    );
    if (cancelled) return toBooking(cancelled);

    const settledElsewhere = await bookings.findOne({ id: doc.id });
    return settledElsewhere ? toBooking(settledElsewhere) : null;
  },

  async markFailed(bookingId: string): Promise<void> {
    const bookings = await bookingsCollection();
    const now = new Date();

    // A late or duplicated failure must never undo a confirmed booking the
    // guest has already been shown; the status guard is part of the filter
    // so the check and the write cannot interleave.
    const result = await bookings.findOneAndUpdate(
      { id: bookingId, status: { $in: ["awaiting_payment", "expired"] } },
      {
        $set: { status: "cancelled", updatedAt: now },
        $unset: { expiresAt: "" },
      },
      { returnDocument: "after" },
    );
    if (!result) return;

    await releaseClaim({
      clubId: result.clubId,
      tableId: result.tableId,
      date: result.date,
      ref: result.id,
    });
  },

  async bookingForHold(holdId: string): Promise<Booking | undefined> {
    const bookings = await bookingsCollection();
    const doc = await bookings.findOne({ holdId });
    return doc ? toBooking(doc) : undefined;
  },

  async attachPayment(bookingId: string, paymentId: string): Promise<void> {
    const bookings = await bookingsCollection();
    await bookings.updateOne(
      { id: bookingId },
      { $set: { paymentId, updatedAt: new Date() } },
    );
  },

  async byId(bookingId: string): Promise<Booking | undefined> {
    const bookings = await bookingsCollection();
    const doc = await bookings.findOne({ id: bookingId });
    if (!doc) return undefined;
    return toBooking(await settleExpiry(doc, new Date()));
  },

  async listForSession(sessionId: string): Promise<Booking[]> {
    const bookings = await bookingsCollection();
    const documents = await bookings
      .find({ sessionId })
      .sort({ createdAt: -1 })
      .toArray();

    const now = new Date();
    return Promise.all(
      documents.map(async (doc) => toBooking(await settleExpiry(doc, now))),
    );
  },

  async listForDate(date: string, clubId?: string): Promise<Booking[]> {
    const bookings = await bookingsCollection();
    const documents = await bookings
      .find(clubId ? { date, clubId } : { date })
      .sort({ start: 1 })
      .toArray();

    const now = new Date();
    return Promise.all(
      documents.map(async (doc) => toBooking(await settleExpiry(doc, now))),
    );
  },

  async cancel(bookingId: string): Promise<Booking | null> {
    const bookings = await bookingsCollection();
    const doc = await bookings.findOne({ id: bookingId });
    if (!doc) return null;
    if (doc.status === "cancelled") return toBooking(doc);

    const now = new Date();
    // Money already taken means money owed back. The flag is what tells the
    // operator there is a refund to make, not merely a table to re-sell.
    const cancelled = await bookings.findOneAndUpdate(
      { id: bookingId, status: { $ne: "cancelled" } },
      {
        $set: {
          status: "cancelled",
          updatedAt: now,
          ...(doc.status === "confirmed" && { refundRequired: true }),
        },
        $unset: { expiresAt: "" },
      },
      { returnDocument: "after" },
    );
    if (!cancelled) return doc ? toBooking(doc) : null;

    await releaseClaim({
      clubId: doc.clubId,
      tableId: doc.tableId,
      date: doc.date,
      ref: doc.id,
    });
    return toBooking(cancelled);
  },

  async _reset(): Promise<void> {
    const [bookings, holds] = await Promise.all([
      bookingsCollection(),
      holdsCollection(),
    ]);
    await Promise.all([
      bookings.deleteMany({}),
      holds.deleteMany({}),
      clearLedger(),
    ]);
  },
};

/**
 * Writes the confirmation, but only from a state that has not been settled
 * yet. Two duplicate callbacks both reach here; the second finds the
 * booking already confirmed and returns that rather than rewriting it.
 */
async function confirm(doc: BookingDoc, now: Date): Promise<Booking> {
  const bookings = await bookingsCollection();
  const confirmed = await bookings.findOneAndUpdate(
    { id: doc.id, status: { $in: ["awaiting_payment", "expired"] } },
    {
      $set: { status: "confirmed", updatedAt: now },
      $unset: { expiresAt: "" },
    },
    { returnDocument: "after" },
  );

  // Housekeeping only; availability already ignores expired claims.
  await pruneExpired(doc.clubId, doc.date, now);

  if (confirmed) return toBooking(confirmed);

  const current = await bookings.findOne({ id: doc.id });
  return current
    ? toBooking(current)
    : { ...toBooking(doc), status: "confirmed" };
}

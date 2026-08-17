import "server-only";

import { processMap, processMutex } from "@/shared/lib/process-store";

import { clubRepository } from "@/entities/club/repository";
import {
  HOLD_TTL_MS,
  PAYMENT_WINDOW_MS,
  type Booking,
  type Hold,
  type Occupancy,
} from "./model";
import { isRangeFree, priceFor, tableById } from "./lib";
import type { BookingRepository, CreateHoldInput, HoldResult } from "./ports";

/**
 * In-memory booking adapter.
 *
 * Kept after M2b as the development and unit-test adapter: it needs no
 * database, so the fast suite stays fast and a contributor can run the app
 * before installing anything. It is never used in production — storage
 * selection refuses that outright (`shared/db/storage.ts`).
 *
 * Every mutation goes through `mutex` so the check-then-write in `hold`
 * cannot interleave. That is enough for one process and only one process,
 * which is exactly why the MongoDB adapter exists (ADR-0009).
 */

const holds = processMap<Hold>("booking.holds");
const bookings = processMap<Booking>("booking.bookings");
const holdsByKey = processMap<string>("booking.holdsByKey");
/**
 * Which booking a hold turned into. A second submit of the same hold — a
 * double-tapped button, a duplicate tab — must be told "your payment is
 * already running", not "your hold expired", which would be both wrong and
 * frightening while their money is in flight.
 */
const bookingByHold = processMap<string>("booking.bookingByHold");

/** Serialises mutations; the in-memory store has no transactions. */
const exclusive = processMutex("booking");

function isLive(hold: Hold, now: number): boolean {
  return Date.parse(hold.expiresAt) > now;
}

function sweep(now: number): void {
  for (const [id, hold] of holds) {
    if (!isLive(hold, now)) holds.delete(id);
  }
  for (const [id, booking] of bookings) {
    if (
      booking.status === "awaiting_payment" &&
      booking.expiresAt &&
      Date.parse(booking.expiresAt) <= now
    ) {
      bookings.set(id, { ...booking, status: "expired" });
    }
  }
}

/**
 * Everything blocking a table right now: confirmed, awaiting payment, held.
 *
 * `exceptBookingId` excludes a booking *by identity*, not by shape — two
 * bookings for the same table and time are exactly the case this has to
 * tell apart.
 */
function occupancy(
  clubId: string,
  date: string,
  now: number,
  exceptBookingId?: string,
): Occupancy[] {
  sweep(now);
  const fromBookings = [...bookings.values()]
    .filter(
      (b) =>
        b.id !== exceptBookingId &&
        b.clubId === clubId &&
        b.date === date &&
        (b.status === "confirmed" || b.status === "awaiting_payment"),
    )
    .map(({ tableId, date: d, start, end }) => ({
      tableId,
      date: d,
      start,
      end,
    }));
  const fromHolds = [...holds.values()]
    .filter((h) => h.clubId === clubId && h.date === date)
    .map(({ tableId, date: d, start, end }) => ({
      tableId,
      date: d,
      start,
      end,
    }));
  return [...fromBookings, ...fromHolds];
}

function reference(): string {
  const alphabet = "ACEFHJKLMNPRTUVWXY3479";
  let out = "";
  for (let i = 0; i < 4; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `RSV-${out}`;
}

export const memoryBookingRepository: BookingRepository = {
  /** Occupied ranges for a club/date — the input to availability rendering. */
  async occupancyFor(clubId: string, date: string): Promise<Occupancy[]> {
    return exclusive(() => occupancy(clubId, date, Date.now()));
  },

  /**
   * Reserve a slot for HOLD_TTL_MS. The availability check happens inside
   * the lock, so two people tapping the same slot cannot both win.
   */
  async hold(input: CreateHoldInput): Promise<HoldResult> {
    return exclusive(async () => {
      const existingId = holdsByKey.get(input.idempotencyKey);
      const existing = existingId ? holds.get(existingId) : undefined;
      if (existing && isLive(existing, Date.now())) {
        const club = await clubRepository.byId(existing.clubId);
        const table = club && tableById(club, existing.tableId);
        return table
          ? {
              ok: true as const,
              hold: existing,
              total: priceFor(table, existing.end - existing.start).amount,
            }
          : { ok: false as const, reason: "unknown_table" as const };
      }

      const club = await clubRepository.byId(input.clubId);
      if (!club)
        return { ok: false as const, reason: "unknown_table" as const };
      const table = tableById(club, input.tableId);
      if (!table)
        return { ok: false as const, reason: "unknown_table" as const };

      const now = Date.now();
      const busy = occupancy(input.clubId, input.date, now);
      const range = { start: input.start, end: input.end };
      if (!isRangeFree(club, input.date, input.tableId, range, busy)) {
        // Distinguish "closed then" from "someone got there first" so the UI
        // can say which, rather than a generic failure.
        const emptyDayCheck = isRangeFree(
          club,
          input.date,
          input.tableId,
          range,
          [],
        );
        return {
          ok: false as const,
          reason: emptyDayCheck ? ("taken" as const) : ("closed" as const),
        };
      }

      const hold: Hold = {
        id: crypto.randomUUID(),
        clubId: input.clubId,
        tableId: input.tableId,
        date: input.date,
        start: input.start,
        end: input.end,
        sessionId: input.sessionId,
        expiresAt: new Date(now + HOLD_TTL_MS).toISOString(),
      };
      holds.set(hold.id, hold);
      holdsByKey.set(input.idempotencyKey, hold.id);
      return {
        ok: true as const,
        hold,
        total: priceFor(table, input.end - input.start).amount,
      };
    });
  },

  async release(holdId: string): Promise<void> {
    await exclusive(() => {
      holds.delete(holdId);
    });
  },

  async getHold(holdId: string): Promise<Hold | undefined> {
    return exclusive(() => {
      sweep(Date.now());
      return holds.get(holdId);
    });
  },

  /**
   * Converts a live hold into a booking awaiting payment. The slot stays
   * blocked while the payment provider works, so a slow PSP cannot lose the
   * table the guest is paying for.
   */
  async reserveForPayment(
    holdId: string,
    phone: string,
  ): Promise<Booking | null> {
    return exclusive(async () => {
      const now = Date.now();
      sweep(now);
      const hold = holds.get(holdId);
      if (!hold) return null;

      const club = await clubRepository.byId(hold.clubId);
      const table = club && tableById(club, hold.tableId);
      if (!table) return null;

      const booking: Booking = {
        id: crypto.randomUUID(),
        reference: reference(),
        clubId: hold.clubId,
        tableId: hold.tableId,
        date: hold.date,
        start: hold.start,
        end: hold.end,
        status: "awaiting_payment",
        sessionId: hold.sessionId,
        total: priceFor(table, hold.end - hold.start).amount,
        phone,
        createdAt: new Date(now).toISOString(),
        // Fresh window: the hold's leftover seconds must not decide whether
        // a payment in flight keeps its table.
        expiresAt: new Date(now + PAYMENT_WINDOW_MS).toISOString(),
      };
      bookings.set(booking.id, booking);
      bookingByHold.set(holdId, booking.id);
      holds.delete(holdId);
      return booking;
    });
  },

  /**
   * Settles a successful payment.
   *
   * Payment confirmations are not trustworthy about *time*: providers retry,
   * webhooks duplicate, and a settlement can land long after the payment
   * window closed. So this re-checks reality before confirming:
   *
   * - already confirmed → return it unchanged (duplicate callback);
   * - window lapsed and the slot has since gone → the guest is owed a
   *   refund, and we say so rather than double-booking the table;
   * - otherwise → confirm, even if late, because the table is still free
   *   and the guest has paid for it.
   */
  async markPaid(bookingId: string): Promise<Booking | null> {
    return exclusive(async () => {
      const now = Date.now();
      const booking = bookings.get(bookingId);
      if (!booking) return null;
      if (booking.status === "confirmed") return booking;
      if (booking.status === "cancelled") return booking;

      const lapsed =
        booking.status === "expired" ||
        (booking.expiresAt !== undefined &&
          Date.parse(booking.expiresAt) <= now);

      if (lapsed) {
        const club = await clubRepository.byId(booking.clubId);
        const others = occupancy(booking.clubId, booking.date, now, booking.id);
        const stillFree =
          club !== undefined &&
          isRangeFree(
            club,
            booking.date,
            booking.tableId,
            { start: booking.start, end: booking.end },
            others,
          );

        if (!stillFree) {
          const owed: Booking = {
            ...booking,
            status: "cancelled",
            refundRequired: true,
          };
          delete (owed as { expiresAt?: string }).expiresAt;
          bookings.set(bookingId, owed);
          return owed;
        }
      }

      const paid: Booking = { ...booking, status: "confirmed" };
      delete (paid as { expiresAt?: string }).expiresAt;
      bookings.set(bookingId, paid);
      return paid;
    });
  },

  /**
   * Settles a failed payment. Only a booking still awaiting payment can be
   * cancelled this way — a late or duplicated failure must never undo a
   * confirmed booking the guest has already been shown.
   */
  async markFailed(bookingId: string): Promise<void> {
    await exclusive(() => {
      const booking = bookings.get(bookingId);
      if (!booking) return;
      if (
        booking.status !== "awaiting_payment" &&
        booking.status !== "expired"
      ) {
        return;
      }
      bookings.set(bookingId, { ...booking, status: "cancelled" });
    });
  },

  /** The booking a hold already became, if any (duplicate-submit path). */
  async bookingForHold(holdId: string): Promise<Booking | undefined> {
    return exclusive(() => {
      const id = bookingByHold.get(holdId);
      return id ? bookings.get(id) : undefined;
    });
  },

  /** Records which payment attempt owns a booking, so retries can resume it. */
  async attachPayment(bookingId: string, paymentId: string): Promise<void> {
    await exclusive(() => {
      const booking = bookings.get(bookingId);
      if (booking) bookings.set(bookingId, { ...booking, paymentId });
    });
  },

  async byId(bookingId: string): Promise<Booking | undefined> {
    return exclusive(() => {
      sweep(Date.now());
      return bookings.get(bookingId);
    });
  },

  /** Bookings made from one browser, newest first. */
  async listForSession(sessionId: string): Promise<Booking[]> {
    return exclusive(() => {
      sweep(Date.now());
      return [...bookings.values()]
        .filter((booking) => booking.sessionId === sessionId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    });
  },

  async listForDate(date: string, clubId?: string): Promise<Booking[]> {
    return exclusive(() => {
      sweep(Date.now());
      return [...bookings.values()]
        .filter(
          (booking) =>
            booking.date === date && (!clubId || booking.clubId === clubId),
        )
        .sort((a, b) => a.start - b.start);
    });
  },

  async cancel(bookingId: string): Promise<Booking | null> {
    return exclusive(() => {
      const booking = bookings.get(bookingId);
      if (!booking) return null;
      if (booking.status === "cancelled") return booking;

      // Money already taken means money owed back; the flag is what tells
      // the operator there is a refund to make, not just a free table.
      const cancelled: Booking = {
        ...booking,
        status: "cancelled",
        ...(booking.status === "confirmed" && { refundRequired: true }),
      };
      delete (cancelled as { expiresAt?: string }).expiresAt;
      bookings.set(bookingId, cancelled);
      return cancelled;
    });
  },

  /** Test seam: the in-memory adapter has no other way to start clean. */
  async _reset(): Promise<void> {
    await exclusive(() => {
      holds.clear();
      bookings.clear();
      holdsByKey.clear();
      bookingByHold.clear();
    });
  },
};

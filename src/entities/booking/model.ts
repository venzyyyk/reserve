import type { TableType } from "@/entities/club";

/** Minutes from midnight of the booking date; may exceed 1440 past midnight. */
export type Minutes = number;

/** ISO date, "2026-08-01" — the *session* date, not the calendar close date. */
export type IsoDate = string;

/**
 * A single physical table. Clubs describe inventory in groups
 * ("8 russian tables"), so individual tables are derived: stable ids that
 * survive a rebuild as long as the group order and counts hold.
 */
export interface Table {
  id: string;
  type: TableType;
  /** 1-based within the club, matching how staff number tables in the room. */
  number: number;
  /** Integer kopiykas per hour. */
  pricePerHour: number;
  sizeFt?: number;
  brand?: string;
}

export interface TimeRange {
  start: Minutes;
  end: Minutes;
}

/** A confirmed booking or an active hold — both occupy a table. */
export interface Occupancy extends TimeRange {
  tableId: string;
  date: IsoDate;
}

export type BookingStatus =
  "held" | "awaiting_payment" | "confirmed" | "cancelled" | "expired";

export interface Booking extends Occupancy {
  id: string;
  /** Human-facing reference printed on the ticket: "RSV-4K2P". */
  reference: string;
  clubId: string;
  status: BookingStatus;
  /** Integer kopiykas actually charged. */
  total: number;
  phone: string;
  /**
   * The browser that made the booking. Guest checkout means there is no
   * account to attach it to, so this is what lets someone find their own
   * ticket again on the device they booked from (`/my`).
   */
  sessionId: string;
  createdAt: string;
  /** Present while the slot is reserved but unpaid. */
  expiresAt?: string;
  /** The payment attempt that owns this booking, once one has started. */
  paymentId?: string;
  /**
   * The payment settled, but the slot was gone by the time it did. The
   * guest is owed their money back and must be told plainly — this is the
   * one outcome where we have taken payment and cannot deliver.
   */
  refundRequired?: boolean;
}

export interface Hold extends Occupancy {
  id: string;
  clubId: string;
  expiresAt: string;
  sessionId: string;
}

/** How long a table is kept while the guest pays (MPS §4). */
export const HOLD_TTL_MS = 5 * 60 * 1000;

/**
 * How long the slot stays blocked once a payment has actually started.
 *
 * Deliberately independent of the hold's remaining time: a guest who
 * reaches the card form with twenty seconds left must not lose the table
 * mid-transaction because a provider took thirty. The window starts when
 * the payment does (MPS §4 — the hold grace-extends once the PSP
 * handshake begins).
 */
export const PAYMENT_WINDOW_MS = 10 * 60 * 1000;

/** Booking granularity. Anything finer makes the timeline unreadable. */
export const SLOT_MINUTES = 30;

/** Durations offered as one-tap presets, in minutes. */
export const DURATION_PRESETS = [60, 120, 180] as const;

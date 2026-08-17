import type { Booking, Hold, Occupancy } from "./model";

/**
 * The booking repository contract.
 *
 * This is what the rest of the product is written against, and M2b did not
 * change a line of it — the in-memory and MongoDB adapters are two
 * implementations of the same interface (ADR-0004). Nothing here mentions
 * storage: no documents, no ids that belong to a driver, no transactions.
 */
export interface CreateHoldInput {
  clubId: string;
  tableId: string;
  date: string;
  start: number;
  end: number;
  sessionId: string;
  /** Retrying the same key returns the original hold instead of a second one. */
  idempotencyKey: string;
}

export type HoldResult =
  | { ok: true; hold: Hold; total: number }
  | { ok: false; reason: "taken" | "closed" | "unknown_table" };

export interface BookingRepository {
  /** Occupied ranges for a club/date — the input to availability rendering. */
  occupancyFor(clubId: string, date: string): Promise<Occupancy[]>;

  /** Reserve a slot for HOLD_TTL_MS. Two people cannot both win a slot. */
  hold(input: CreateHoldInput): Promise<HoldResult>;

  release(holdId: string): Promise<void>;

  getHold(holdId: string): Promise<Hold | undefined>;

  /** Converts a live hold into a booking awaiting payment. */
  reserveForPayment(holdId: string, phone: string): Promise<Booking | null>;

  /** Settles a successful payment, including late and duplicated ones. */
  markPaid(bookingId: string): Promise<Booking | null>;

  /** Settles a failed payment. Never undoes a confirmed booking. */
  markFailed(bookingId: string): Promise<void>;

  /** The booking a hold already became, if any (duplicate-submit path). */
  bookingForHold(holdId: string): Promise<Booking | undefined>;

  /** Records which payment attempt owns a booking, so retries can resume it. */
  attachPayment(bookingId: string, paymentId: string): Promise<void>;

  byId(bookingId: string): Promise<Booking | undefined>;

  /** Bookings made from one browser, newest first — the guest's own list. */
  listForSession(sessionId: string): Promise<Booking[]>;

  /** Operational view: everything a club has on a given date. */
  listForDate(date: string, clubId?: string): Promise<Booking[]>;

  /**
   * Cancels a confirmed booking on the club's behalf and frees the table.
   * Returns null if there was nothing to cancel.
   */
  cancel(bookingId: string): Promise<Booking | null>;

  /** Test seam: start from a known-empty state. */
  _reset(): Promise<void>;
}

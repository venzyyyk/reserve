import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mongoBookingRepository as repository } from "../repository.mongo";
import { paymentStore } from "../payment-store";
import { HOLD_TTL_MS, PAYMENT_WINDOW_MS } from "../model";

/**
 * The M2a chaos review, re-run against MongoDB.
 *
 * Every scenario here found or fixed a real bug once: a hold that expired
 * mid-payment, a late settlement that double-booked a table, a duplicate
 * failure that cancelled a confirmed booking. The migration is only done
 * when the database reproduces those outcomes exactly.
 *
 * Only `Date` is faked. The driver's own heartbeats and socket timeouts run
 * on real timers, and freezing those would break the connection rather than
 * the clock.
 */
const CLUB = "clb_kyiv_klasyk";
const TABLE = "russian-1";
const date = (): string =>
  new Date(Date.now() + 3 * 86_400_000).toISOString().slice(0, 10);

let cursor = 15 * 60;
const nextSlot = (minutes = 60): { start: number; end: number } => {
  const start = cursor;
  cursor += minutes;
  return { start, end: start + minutes };
};

const hold = (range: { start: number; end: number }, tableId = TABLE) =>
  repository.hold({
    clubId: CLUB,
    tableId,
    date: date(),
    ...range,
    sessionId: "sess",
    idempotencyKey: crypto.randomUUID(),
  });

const advance = (ms: number): void => {
  vi.setSystemTime(new Date(Date.now() + ms));
};

describe("chaos: holds and payment settlement on MongoDB", () => {
  beforeEach(async () => {
    await repository._reset();
    await paymentStore._reset();
    vi.useFakeTimers({ toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("frees the table when a hold expires", async () => {
    const range = nextSlot();
    const first = await hold(range);
    expect(first.ok).toBe(true);

    advance(HOLD_TTL_MS + 1000);

    const second = await hold(range);
    expect(second.ok).toBe(true);
  });

  it("reports an expired hold as gone rather than live", async () => {
    const first = await hold(nextSlot());
    if (!first.ok) throw new Error("setup failed");

    advance(HOLD_TTL_MS + 1000);

    expect(await repository.getHold(first.hold.id)).toBeUndefined();
    expect(
      await repository.reserveForPayment(first.hold.id, "+380671112233"),
    ).toBeNull();
  });

  it("leaves an expired hold out of occupancy immediately, not on a timer", async () => {
    const range = nextSlot();
    await hold(range);

    advance(HOLD_TTL_MS + 1000);

    const occupancy = await repository.occupancyFor(CLUB, date());
    expect(
      occupancy.some(
        (slot) => slot.start === range.start && slot.tableId === TABLE,
      ),
    ).toBe(false);
  });

  it("gives a payment its own window instead of the hold's leftovers", async () => {
    const held = await hold(nextSlot());
    if (!held.ok) throw new Error("setup failed");

    // Almost all of the hold is gone by the time the guest submits.
    advance(HOLD_TTL_MS - 2000);

    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    expect(booking).not.toBeNull();
    if (!booking?.expiresAt) throw new Error("expected a payment window");

    const remaining = Date.parse(booking.expiresAt) - Date.now();
    expect(remaining).toBeGreaterThan(PAYMENT_WINDOW_MS - 5000);
  });

  it("confirms a late payment when the table is still free", async () => {
    const held = await hold(nextSlot());
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    advance(PAYMENT_WINDOW_MS + 60_000);

    const settled = await repository.markPaid(booking.id);
    expect(settled?.status).toBe("confirmed");
    expect(settled?.refundRequired).toBeUndefined();
  });

  it("owes a refund when a late payment lands on a table someone else took", async () => {
    const range = nextSlot();
    const held = await hold(range);
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    advance(PAYMENT_WINDOW_MS + 60_000);

    // Someone else books the freed slot and pays.
    const rival = await hold(range);
    if (!rival.ok) throw new Error("rival should have won the free slot");
    const rivalBooking = await repository.reserveForPayment(
      rival.hold.id,
      "+380670000000",
    );
    if (!rivalBooking) throw new Error("setup failed");
    await repository.markPaid(rivalBooking.id);

    // Now the original payment finally settles.
    const settled = await repository.markPaid(booking.id);
    expect(settled?.status).toBe("cancelled");
    expect(settled?.refundRequired).toBe(true);

    // And the table belongs to exactly one of them.
    const occupancy = await repository.occupancyFor(CLUB, date());
    const claims = occupancy.filter(
      (slot) => slot.tableId === TABLE && slot.start === range.start,
    );
    expect(claims).toHaveLength(1);

    const rivalAfter = await repository.byId(rivalBooking.id);
    expect(rivalAfter?.status).toBe("confirmed");
  });

  it("never lets a duplicate failure cancel a confirmed booking", async () => {
    const held = await hold(nextSlot());
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    await repository.markPaid(booking.id);
    await repository.markFailed(booking.id);
    await repository.markFailed(booking.id);

    expect((await repository.byId(booking.id))?.status).toBe("confirmed");
  });

  it("releases the table when a payment fails", async () => {
    const range = nextSlot();
    const held = await hold(range);
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    await repository.markFailed(booking.id);
    expect((await repository.byId(booking.id))?.status).toBe("cancelled");

    const retry = await hold(range);
    expect(retry.ok).toBe(true);
  });

  it("marks a booking expired once its payment window closes", async () => {
    const held = await hold(nextSlot());
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    advance(PAYMENT_WINDOW_MS + 1000);

    expect((await repository.byId(booking.id))?.status).toBe("expired");
  });

  it("resumes the original payment when the same hold is submitted twice", async () => {
    const held = await hold(nextSlot());
    if (!held.ok) throw new Error("setup failed");

    const first = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    const second = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );

    expect(first).not.toBeNull();
    // The hold is consumed; the caller is pointed at the payment already
    // running rather than told their hold expired while money is in flight.
    expect(second).toBeNull();
    expect((await repository.bookingForHold(held.hold.id))?.id).toBe(first?.id);
  });
});

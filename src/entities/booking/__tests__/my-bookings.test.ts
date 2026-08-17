import { beforeEach, describe, expect, it } from "vitest";
import { memoryBookingRepository as repository } from "../repository.memory";

/**
 * "My bookings" and the operator's day view.
 *
 * Both read the same records from different angles, and both have one rule
 * that matters more than the listing itself: a guest may only ever see
 * their own bookings, and cancelling one that was paid for must leave a
 * trace that money is owed.
 */
const CLUB = "clb_kyiv_klasyk";
const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

let cursor = 15 * 60;
const nextSlot = () => {
  const start = cursor;
  cursor += 60;
  return { start, end: start + 60 };
};

async function bookFor(sessionId: string, tableId = "russian-1") {
  const range = nextSlot();
  const held = await repository.hold({
    clubId: CLUB,
    tableId,
    date: tomorrow,
    ...range,
    sessionId,
    idempotencyKey: crypto.randomUUID(),
  });
  if (!held.ok) throw new Error(`hold failed: ${held.reason}`);

  const booking = await repository.reserveForPayment(
    held.hold.id,
    "+380671112233",
  );
  if (!booking) throw new Error("reserve failed");
  await repository.markPaid(booking.id);
  return booking;
}

describe("listForSession", () => {
  beforeEach(async () => {
    await repository._reset();
  });

  it("carries the booking session across from the hold", async () => {
    const booking = await bookFor("sess_a");
    expect(booking.sessionId).toBe("sess_a");
  });

  it("shows a guest their own bookings and nobody else's", async () => {
    const mine = await bookFor("sess_a");
    await bookFor("sess_b");

    const listed = await repository.listForSession("sess_a");
    expect(listed.map((booking) => booking.id)).toEqual([mine.id]);
  });

  it("returns nothing for a browser that has booked nothing", async () => {
    await bookFor("sess_a");
    expect(await repository.listForSession("sess_unknown")).toEqual([]);
  });
});

describe("listForDate", () => {
  beforeEach(async () => {
    await repository._reset();
  });

  it("lists a day in start order, and filters by club", async () => {
    await bookFor("sess_a", "russian-1");
    await bookFor("sess_b", "russian-2");

    const day = await repository.listForDate(tomorrow);
    expect(day.length).toBe(2);
    expect(day[0]!.start).toBeLessThan(day[1]!.start);

    expect(await repository.listForDate(tomorrow, CLUB)).toHaveLength(2);
    expect(await repository.listForDate(tomorrow, "clb_other")).toHaveLength(0);
  });

  it("returns nothing for a day with no bookings", async () => {
    expect(await repository.listForDate("2020-01-01")).toEqual([]);
  });
});

describe("cancel", () => {
  beforeEach(async () => {
    await repository._reset();
  });

  it("frees the table and records that a refund is owed", async () => {
    const booking = await bookFor("sess_a");

    const cancelled = await repository.cancel(booking.id);
    expect(cancelled?.status).toBe("cancelled");
    // The guest paid; somebody has to send the money back.
    expect(cancelled?.refundRequired).toBe(true);

    const retry = await repository.hold({
      clubId: CLUB,
      tableId: booking.tableId,
      date: booking.date,
      start: booking.start,
      end: booking.end,
      sessionId: "sess_other",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(retry.ok).toBe(true);
  });

  it("is idempotent and does not invent a second refund", async () => {
    const booking = await bookFor("sess_a");
    const first = await repository.cancel(booking.id);
    const second = await repository.cancel(booking.id);
    expect(second).toStrictEqual(first);
  });

  it("returns null for a booking that does not exist", async () => {
    expect(await repository.cancel("nope")).toBeNull();
  });
});

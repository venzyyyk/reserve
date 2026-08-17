import { bookingRepository } from "../repository";
import { HOLD_TTL_MS } from "../model";

/**
 * Chaos review of the booking system: every scenario here is something a
 * real guest, a flaky network or a slow payment provider will eventually do.
 * The rule is that none of them may produce a double booking, a charge for
 * a table someone else has, or a lost payment.
 */

const CLUB = "clb_kyiv_klasyk";
const TABLE = "russian-1";
const DATE = "2026-09-01"; // a Tuesday: 12:00–02:00
const SLOT = { start: 1200, end: 1320 };

async function freshHold(key = crypto.randomUUID(), slot = SLOT) {
  return bookingRepository.hold({
    clubId: CLUB,
    tableId: TABLE,
    date: DATE,
    ...slot,
    sessionId: crypto.randomUUID(),
    idempotencyKey: key,
  });
}

beforeEach(async () => {
  vi.useRealTimers();
  await bookingRepository._reset();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("simultaneous holds", () => {
  it("lets exactly one of ten concurrent requests win the same slot", async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, () => freshHold()),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.reason === "taken")).toHaveLength(
      9,
    );
  });

  it("lets concurrent requests for overlapping ranges resolve to one winner", async () => {
    const [a, b] = await Promise.all([
      freshHold(undefined, { start: 1200, end: 1320 }),
      freshHold(undefined, { start: 1260, end: 1380 }),
    ]);
    expect([a.ok, b.ok].filter(Boolean)).toHaveLength(1);
  });

  it("allows neighbouring ranges that only touch at the boundary", async () => {
    const a = await freshHold(undefined, { start: 1200, end: 1320 });
    const b = await freshHold(undefined, { start: 1320, end: 1380 });
    expect(a.ok && b.ok).toBe(true);
  });
});

describe("double submits and refreshes", () => {
  it("returns the same hold for a retried idempotency key", async () => {
    const first = await freshHold("same-key");
    const second = await freshHold("same-key");
    expect(first.ok && second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.hold.id).toBe(first.hold.id);
    }
  });

  it("only one of two payment submissions for one hold can reserve it", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");

    const [a, b] = await Promise.all([
      bookingRepository.reserveForPayment(held.hold.id, "+380671234567"),
      bookingRepository.reserveForPayment(held.hold.id, "+380671234567"),
    ]);
    expect([a, b].filter(Boolean)).toHaveLength(1);
  });

  it("releasing a hold twice is harmless", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    await bookingRepository.release(held.hold.id);
    await expect(
      bookingRepository.release(held.hold.id),
    ).resolves.toBeUndefined();
  });
});

describe("expiry", () => {
  it("frees the slot once the hold's TTL passes", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    expect(held.ok).toBe(true);

    vi.advanceTimersByTime(HOLD_TTL_MS + 1000);

    const occupied = await bookingRepository.occupancyFor(CLUB, DATE);
    expect(occupied).toHaveLength(0);

    const second = await freshHold();
    expect(second.ok).toBe(true);
  });

  it("refuses to start a payment on an expired hold", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");

    vi.advanceTimersByTime(HOLD_TTL_MS + 1000);

    await expect(
      bookingRepository.reserveForPayment(held.hold.id, "+380671234567"),
    ).resolves.toBeNull();
  });

  it("keeps the slot blocked while a payment is genuinely in flight", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    await bookingRepository.reserveForPayment(held.hold.id, "+380671234567");

    // Past the original hold TTL, but the payment window is still open.
    vi.advanceTimersByTime(HOLD_TTL_MS + 1000);

    const occupied = await bookingRepository.occupancyFor(CLUB, DATE);
    expect(occupied).toHaveLength(1);
  });
});

describe("payment callbacks", () => {
  it("is idempotent when the same success arrives twice", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!booking) throw new Error("setup");

    const first = await bookingRepository.markPaid(booking.id);
    const second = await bookingRepository.markPaid(booking.id);
    expect(first?.status).toBe("confirmed");
    expect(second?.status).toBe("confirmed");
    expect(second?.reference).toBe(first?.reference);
  });

  it("never cancels a confirmed booking when a stale failure arrives late", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!booking) throw new Error("setup");

    await bookingRepository.markPaid(booking.id);
    await bookingRepository.markFailed(booking.id);

    const after = await bookingRepository.byId(booking.id);
    expect(after?.status).toBe("confirmed");
  });

  it("does not confirm a booking whose slot was already given away", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!booking) throw new Error("setup");

    // The payment window lapses and another guest takes the slot.
    vi.advanceTimersByTime(60 * 60 * 1000);
    const other = await freshHold();
    expect(other.ok).toBe(true);
    if (!other.ok) throw new Error("setup");
    const otherBooking = await bookingRepository.reserveForPayment(
      other.hold.id,
      "+380670000000",
    );
    if (!otherBooking) throw new Error("setup");
    await bookingRepository.markPaid(otherBooking.id);

    // The original payment finally settles. It must not double-book.
    const late = await bookingRepository.markPaid(booking.id);
    expect(late?.status).not.toBe("confirmed");

    const confirmed = (await bookingRepository.occupancyFor(CLUB, DATE)).length;
    expect(confirmed).toBe(1);
  });

  it("still confirms a late payment when the slot is untouched", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!booking) throw new Error("setup");

    vi.advanceTimersByTime(60 * 60 * 1000);

    const late = await bookingRepository.markPaid(booking.id);
    expect(late?.status).toBe("confirmed");
  });
});

describe("duplicate payment submissions", () => {
  it("points a second submit at the payment already running", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");

    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!booking) throw new Error("setup");
    await bookingRepository.attachPayment(booking.id, "pay_1");

    // The hold is gone, but it became a booking — not an expiry.
    const resumed = await bookingRepository.bookingForHold(held.hold.id);
    expect(resumed?.id).toBe(booking.id);
    expect(resumed?.paymentId).toBe("pay_1");
  });

  it("has nothing to resume for a hold that never became a booking", async () => {
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    await bookingRepository.release(held.hold.id);
    await expect(
      bookingRepository.bookingForHold(held.hold.id),
    ).resolves.toBeUndefined();
  });
});

describe("refunds", () => {
  it("flags a payment that settled after the slot was lost", async () => {
    vi.useFakeTimers();
    const held = await freshHold();
    if (!held.ok) throw new Error("setup");
    const mine = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671234567",
    );
    if (!mine) throw new Error("setup");

    vi.advanceTimersByTime(60 * 60 * 1000);
    const rival = await freshHold();
    if (!rival.ok) throw new Error("setup");
    const rivalBooking = await bookingRepository.reserveForPayment(
      rival.hold.id,
      "+380670000000",
    );
    if (!rivalBooking) throw new Error("setup");
    await bookingRepository.markPaid(rivalBooking.id);

    const late = await bookingRepository.markPaid(mine.id);
    expect(late?.status).toBe("cancelled");
    expect(late?.refundRequired).toBe(true);
  });
});

describe("input hostility", () => {
  it("rejects a hold on a table the club does not have", async () => {
    const result = await bookingRepository.hold({
      clubId: CLUB,
      tableId: "russian-999",
      date: DATE,
      ...SLOT,
      sessionId: "s",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(result).toEqual({ ok: false, reason: "unknown_table" });
  });

  it("rejects a range outside opening hours", async () => {
    const result = await bookingRepository.hold({
      clubId: CLUB,
      tableId: TABLE,
      date: DATE,
      start: 300,
      end: 360,
      sessionId: "s",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(result).toEqual({ ok: false, reason: "closed" });
  });

  it("rejects a hold on a day the club is shut", async () => {
    const result = await bookingRepository.hold({
      clubId: "clb_lviv_ratusha",
      tableId: "snooker-1",
      date: "2026-09-01",
      start: 100,
      end: 160,
      sessionId: "s",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(result.ok).toBe(false);
  });
});

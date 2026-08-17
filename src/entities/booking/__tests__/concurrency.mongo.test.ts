import { beforeEach, describe, expect, it } from "vitest";
import { mongoBookingRepository as repository } from "../repository.mongo";

/**
 * Concurrency, against a real database.
 *
 * The in-memory adapter's mutex made these pass trivially and dishonestly:
 * one process, one lock. Here the requests genuinely overlap and only the
 * occupancy ledger (ADR-0009) stands between them and a double-booked
 * table.
 */
const CLUB = "clb_kyiv_klasyk";
const TABLE = "russian-1";
const OTHER_TABLE = "russian-2";
const date = (): string =>
  new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);

let cursor = 15 * 60;
const nextSlot = (minutes = 60): { start: number; end: number } => {
  const start = cursor;
  cursor += minutes;
  return { start, end: start + minutes };
};

const hold = (
  range: { start: number; end: number },
  over: Partial<{
    tableId: string;
    idempotencyKey: string;
    sessionId: string;
  }> = {},
) =>
  repository.hold({
    clubId: CLUB,
    tableId: over.tableId ?? TABLE,
    date: date(),
    ...range,
    sessionId: over.sessionId ?? "sess",
    idempotencyKey: over.idempotencyKey ?? crypto.randomUUID(),
  });

describe("concurrent holds", () => {
  beforeEach(async () => {
    await repository._reset();
  });

  it("gives one table to exactly one of ten simultaneous requests", async () => {
    const range = nextSlot();
    const attempts = Array.from({ length: 10 }, () => hold(range));
    const results = await Promise.all(attempts);

    const winners = results.filter((result) => result.ok);
    expect(winners).toHaveLength(1);

    for (const loser of results.filter((result) => !result.ok)) {
      expect(loser).toEqual({ ok: false, reason: "taken" });
    }
  });

  it("rejects an overlapping range even when the hours differ", async () => {
    const first = await hold({ start: 18 * 60, end: 20 * 60 });
    expect(first.ok).toBe(true);

    // Straddles the boundary — the case a unique index on start time misses.
    const overlapping = await hold({ start: 19 * 60, end: 21 * 60 });
    expect(overlapping).toEqual({ ok: false, reason: "taken" });
  });

  it("allows adjacent ranges to touch", async () => {
    const first = await hold({ start: 12 * 60, end: 14 * 60 });
    const second = await hold({ start: 14 * 60, end: 16 * 60 });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("keeps tables independent", async () => {
    const range = nextSlot();
    const first = await hold(range);
    const second = await hold(range, { tableId: OTHER_TABLE });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("returns one hold for a retried request, not two", async () => {
    const range = nextSlot();
    const key = crypto.randomUUID();

    const [first, second] = await Promise.all([
      hold(range, { idempotencyKey: key }),
      hold(range, { idempotencyKey: key }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.hold.id).toBe(first.hold.id);
    }
  });

  it("frees the table when a hold is released", async () => {
    const range = nextSlot();
    const first = await hold(range);
    if (!first.ok) throw new Error("setup failed");

    await repository.release(first.hold.id);

    const second = await hold(range);
    expect(second.ok).toBe(true);
  });

  it("turns exactly one hold into a booking under a double submit", async () => {
    const range = nextSlot();
    const held = await hold(range);
    if (!held.ok) throw new Error("setup failed");

    const [a, b] = await Promise.all([
      repository.reserveForPayment(held.hold.id, "+380671112233"),
      repository.reserveForPayment(held.hold.id, "+380671112233"),
    ]);

    const bookings = [a, b].filter((booking) => booking !== null);
    expect(bookings.length).toBeGreaterThanOrEqual(1);
    // Whichever way the race went, both callers must be looking at one
    // booking — never two payments for one table.
    const ids = new Set(bookings.map((booking) => booking.id));
    expect(ids.size).toBe(1);

    const resumed = await repository.bookingForHold(held.hold.id);
    expect(resumed?.id).toBe([...ids][0]);
  });

  it("confirms once when the same success callback arrives repeatedly", async () => {
    const range = nextSlot();
    const held = await hold(range);
    if (!held.ok) throw new Error("setup failed");
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");

    const settlements = await Promise.all([
      repository.markPaid(booking.id),
      repository.markPaid(booking.id),
      repository.markPaid(booking.id),
    ]);

    for (const settled of settlements) {
      expect(settled?.status).toBe("confirmed");
      expect(settled?.refundRequired).toBeUndefined();
    }

    const occupancy = await repository.occupancyFor(CLUB, date());
    const forThisSlot = occupancy.filter(
      (slot) =>
        slot.tableId === TABLE &&
        slot.start === range.start &&
        slot.end === range.end,
    );
    // One confirmation, one claim on the table — not three.
    expect(forThisSlot).toHaveLength(1);
  });
});

import { beforeEach, describe, expect, it } from "vitest";
import { mongoBookingRepository as repository } from "../repository.mongo";

/**
 * Concurrency, against a real database.
 *
 * The in-memory adapter's mutex made these pass trivially and dishonestly:
 * one process, one lock. Here the requests genuinely overlap and only the
 * occupancy ledger (ADR-0009) stands between them and a double-booked
 * table.
 *
 * Every test gets its own calendar day rather than its own hour. Walking
 * the clock was the obvious approach and the wrong one: after a handful of
 * tests the cursor passes closing time, the club is shut, and a test that
 * means to check concurrency fails with "closed" instead.
 */
const CLUB = "clb_kyiv_klasyk";
const TABLE = "russian-1";
const OTHER_TABLE = "russian-2";

interface Window {
  date: string;
  start: number;
  end: number;
}

/** 15:00–17:00 is inside this club's hours on every weekday. */
const OPEN_START = 15 * 60;
const OPEN_END = 17 * 60;

let dayOffset = 2;
const nextWindow = (): Window => ({
  date: new Date(Date.now() + dayOffset++ * 86_400_000)
    .toISOString()
    .slice(0, 10),
  start: OPEN_START,
  end: OPEN_END,
});

/** Another range on the same day, for overlap and adjacency checks. */
const on = (day: Window, start: number, end: number): Window => ({
  date: day.date,
  start,
  end,
});

const hold = (
  window: Window,
  over: Partial<{ tableId: string; idempotencyKey: string }> = {},
) =>
  repository.hold({
    clubId: CLUB,
    tableId: over.tableId ?? TABLE,
    date: window.date,
    start: window.start,
    end: window.end,
    sessionId: "sess",
    idempotencyKey: over.idempotencyKey ?? crypto.randomUUID(),
  });

describe("concurrent holds", () => {
  beforeEach(async () => {
    await repository._reset();
  });

  it("gives one table to exactly one of ten simultaneous requests", async () => {
    const window = nextWindow();
    const results = await Promise.all(
      Array.from({ length: 10 }, () => hold(window)),
    );

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    for (const loser of results.filter((result) => !result.ok)) {
      expect(loser).toEqual({ ok: false, reason: "taken" });
    }
  });

  it("rejects an overlapping range even when the hours differ", async () => {
    const day = nextWindow();
    const first = await hold(on(day, 15 * 60, 17 * 60));
    expect(first.ok).toBe(true);

    // Straddles the boundary — the case a unique index on start time misses.
    const overlapping = await hold(on(day, 16 * 60, 18 * 60));
    expect(overlapping).toEqual({ ok: false, reason: "taken" });
  });

  it("allows adjacent ranges to touch", async () => {
    const day = nextWindow();
    const first = await hold(on(day, 15 * 60, 17 * 60));
    const second = await hold(on(day, 17 * 60, 19 * 60));

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("keeps tables independent", async () => {
    const window = nextWindow();
    const first = await hold(window);
    const second = await hold(window, { tableId: OTHER_TABLE });

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });

  it("returns one hold for a retried request, not two", async () => {
    const window = nextWindow();
    const key = crypto.randomUUID();

    const [first, second] = await Promise.all([
      hold(window, { idempotencyKey: key }),
      hold(window, { idempotencyKey: key }),
    ]);

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    if (first.ok && second.ok) {
      expect(second.hold.id).toBe(first.hold.id);
    }
  });

  it("frees the table when a hold is released", async () => {
    const window = nextWindow();
    const first = await hold(window);
    if (!first.ok) throw new Error(`setup failed: ${first.reason}`);

    await repository.release(first.hold.id);

    const second = await hold(window);
    expect(second.ok).toBe(true);
  });

  it("turns exactly one hold into a booking under a double submit", async () => {
    const held = await hold(nextWindow());
    if (!held.ok) throw new Error(`setup failed: ${held.reason}`);

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
    const window = nextWindow();
    const held = await hold(window);
    if (!held.ok) throw new Error(`setup failed: ${held.reason}`);
    const booking = await repository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed: could not reserve");

    const settlements = await Promise.all([
      repository.markPaid(booking.id),
      repository.markPaid(booking.id),
      repository.markPaid(booking.id),
    ]);

    for (const settled of settlements) {
      expect(settled?.status).toBe("confirmed");
      expect(settled?.refundRequired).toBeUndefined();
    }

    const occupancy = await repository.occupancyFor(CLUB, window.date);
    const forThisSlot = occupancy.filter(
      (slot) =>
        slot.tableId === TABLE &&
        slot.start === window.start &&
        slot.end === window.end,
    );
    // One confirmation, one claim on the table — not three.
    expect(forThisSlot).toHaveLength(1);
  });
});

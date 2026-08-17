import { beforeEach, describe, expect, it } from "vitest";
import { closeMongo } from "@/shared/db/client";
import { mongoBookingRepository as repository } from "../repository.mongo";
import { paymentStore } from "../payment-store";
import { paymentProvider } from "../payment-provider";

/**
 * The point of M2b, stated as tests: a restart must not lose a booking, and
 * two people must not get the same table.
 *
 * These run against a real MongoDB. Everything they assert was already true
 * of the in-memory adapter — what is new is that it stays true across a
 * reconnect, and under genuine concurrency rather than a single process's
 * mutex.
 */
const CLUB = "clb_kyiv_klasyk";
const TABLE = "russian-1";

interface Window {
  date: string;
  start: number;
  end: number;
}

/**
 * A day of its own per test, at an hour inside opening time. Tests that
 * shared a day would block each other's tables and report it as a bug in
 * the code.
 */
let dayOffset = 60;
const nextWindow = (): Window => ({
  date: new Date(Date.now() + dayOffset++ * 86_400_000)
    .toISOString()
    .slice(0, 10),
  start: 15 * 60,
  end: 17 * 60,
});

const book = async (window: Window) => {
  const held = await repository.hold({
    clubId: CLUB,
    tableId: TABLE,
    date: window.date,
    start: window.start,
    end: window.end,
    sessionId: "sess_test",
    idempotencyKey: crypto.randomUUID(),
  });
  if (!held.ok) throw new Error(`hold failed: ${held.reason}`);

  const booking = await repository.reserveForPayment(
    held.hold.id,
    "+380671112233",
  );
  if (!booking) throw new Error("reserve failed");
  return booking;
};

describe("persistence", () => {
  beforeEach(async () => {
    await repository._reset();
    await paymentStore._reset();
  });

  it("keeps a confirmed booking across a reconnect", async () => {
    const booking = await book(nextWindow());
    const confirmed = await repository.markPaid(booking.id);
    expect(confirmed?.status).toBe("confirmed");

    // The closest thing to a restart that a test can do: drop the client and
    // every pooled connection, then ask again through a fresh one.
    await closeMongo();

    const afterRestart = await repository.byId(booking.id);
    expect(afterRestart?.status).toBe("confirmed");
    expect(afterRestart?.reference).toBe(booking.reference);
    expect(afterRestart?.total).toBe(booking.total);
    expect(afterRestart?.phone).toBe("+380671112233");
  });

  it("keeps the slot blocked across a reconnect", async () => {
    const window = nextWindow();
    const booking = await book(window);
    await repository.markPaid(booking.id);

    await closeMongo();

    const second = await repository.hold({
      clubId: CLUB,
      tableId: TABLE,
      date: window.date,
      start: window.start,
      end: window.end,
      sessionId: "sess_other",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(second).toEqual({ ok: false, reason: "taken" });
  });

  it("keeps payment state across a reconnect", async () => {
    const booking = await book(nextWindow());
    const payment = await paymentProvider.create({
      bookingId: booking.id,
      amount: booking.total,
      method: "card",
    });

    await closeMongo();

    const stored = await paymentStore.byId(payment.id);
    expect(stored?.bookingId).toBe(booking.id);
    expect(stored?.amount).toBe(booking.total);
    expect(stored?.currency).toBe("UAH");
    expect(stored?.provider).toBe("sandbox");
  });

  it("reports occupancy from the database, not from process memory", async () => {
    const window = nextWindow();
    const booking = await book(window);
    await repository.markPaid(booking.id);

    await closeMongo();

    const occupancy = await repository.occupancyFor(CLUB, window.date);
    expect(
      occupancy.some(
        (slot) =>
          slot.tableId === TABLE &&
          slot.start === window.start &&
          slot.end === window.end,
      ),
    ).toBe(true);
  });
});

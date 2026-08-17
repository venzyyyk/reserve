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
const tomorrow = (): string =>
  new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

let slotCursor = 15 * 60;
/** Every test gets its own hours, so one test never blocks another. */
const nextSlot = (minutes = 60): { start: number; end: number } => {
  const start = slotCursor;
  slotCursor += minutes;
  return { start, end: start + minutes };
};

const book = async (
  range: { start: number; end: number },
  date = tomorrow(),
) => {
  const held = await repository.hold({
    clubId: CLUB,
    tableId: TABLE,
    date,
    ...range,
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
    const booking = await book(nextSlot());
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
    const range = nextSlot();
    const booking = await book(range);
    await repository.markPaid(booking.id);

    await closeMongo();

    const second = await repository.hold({
      clubId: CLUB,
      tableId: TABLE,
      date: tomorrow(),
      ...range,
      sessionId: "sess_other",
      idempotencyKey: crypto.randomUUID(),
    });
    expect(second).toEqual({ ok: false, reason: "taken" });
  });

  it("keeps payment state across a reconnect", async () => {
    const booking = await book(nextSlot());
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
    const range = nextSlot();
    const booking = await book(range);
    await repository.markPaid(booking.id);

    await closeMongo();

    const occupancy = await repository.occupancyFor(CLUB, tomorrow());
    expect(
      occupancy.some(
        (slot) =>
          slot.tableId === TABLE &&
          slot.start === range.start &&
          slot.end === range.end,
      ),
    ).toBe(true);
  });
});

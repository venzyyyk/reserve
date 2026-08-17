import { beforeEach, describe, expect, it } from "vitest";
import { bookingRepository } from "@/entities/booking/repository";
import { reviewRepository } from "@/entities/review/repository";
import { submitReview } from "../actions";

/**
 * The action is the only thing standing between a form post and the
 * moderation queue, so it is tested as a unit rather than through the UI:
 * eligibility, validation, and where the guest lands afterwards.
 */

/** `redirect()` signals by throwing; this reads the destination back out. */
async function destinationOf(work: () => Promise<unknown>): Promise<string> {
  try {
    await work();
  } catch (error) {
    const digest = (error as { digest?: string }).digest ?? "";
    const url = digest.split(";")[2];
    if (url) return url;
    throw error;
  }
  throw new Error("expected a redirect");
}

const form = (fields: Record<string, string>): FormData => {
  const data = new FormData();
  for (const [key, value] of Object.entries(fields)) data.set(key, value);
  return data;
};

const valid = {
  rating: "5",
  authorName: "Тарас",
  text: "Столи рівні, сукно нове, адміністратор допоміг з києм.",
};

/** Each booking needs its own slot, or the second one is simply "taken". */
let slot = 15;

/** A confirmed booking whose table time is already over. */
async function playedBooking(): Promise<string> {
  const start = slot++;
  const yesterday = new Date(Date.now() - 86_400_000)
    .toISOString()
    .slice(0, 10);

  const held = await bookingRepository.hold({
    clubId: "clb_kyiv_klasyk",
    tableId: "russian-1",
    date: yesterday,
    start: start * 60,
    end: (start + 1) * 60,
    sessionId: "sess_test",
    idempotencyKey: crypto.randomUUID(),
  });
  if (!held.ok) throw new Error(`could not hold: ${held.reason}`);

  const booking = await bookingRepository.reserveForPayment(
    held.hold.id,
    "+380671112233",
  );
  if (!booking) throw new Error("could not reserve");

  await bookingRepository.attachPayment(booking.id, `pay_${booking.id}`);
  await bookingRepository.markPaid(booking.id);
  return booking.id;
}

describe("submitReview", () => {
  let bookingId = "";

  beforeEach(async () => {
    bookingId = await playedBooking();
  });

  it("files the review and sends the guest back to the ticket", async () => {
    const url = await destinationOf(() =>
      submitReview(form({ bookingId, ...valid })),
    );

    expect(url).toBe(`/booking/${bookingId}?review=sent`);

    const filed = await reviewRepository.byBooking(bookingId);
    expect(filed?.status).toBe("pending");
    expect(filed?.verified).toBe(true);
    expect(filed?.clubName).toBe("Класик");
  });

  it("rejects a review for a booking that does not exist", async () => {
    const url = await destinationOf(() =>
      submitReview(form({ bookingId: "not-a-booking", ...valid })),
    );
    expect(url).toContain("review=notAllowed");
  });

  it("rejects a review for a session that has not happened yet", async () => {
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);
    const held = await bookingRepository.hold({
      clubId: "clb_kyiv_klasyk",
      tableId: "russian-2",
      date: tomorrow,
      start: 15 * 60,
      end: 16 * 60,
      sessionId: "sess_future",
      idempotencyKey: crypto.randomUUID(),
    });
    if (!held.ok) throw new Error("setup failed");
    const booking = await bookingRepository.reserveForPayment(
      held.hold.id,
      "+380671112233",
    );
    if (!booking) throw new Error("setup failed");
    await bookingRepository.markPaid(booking.id);

    const url = await destinationOf(() =>
      submitReview(form({ bookingId: booking.id, ...valid })),
    );
    expect(url).toContain("review=notAllowed");
    expect(await reviewRepository.byBooking(booking.id)).toBeUndefined();
  });

  it("rejects a submit that skipped the browser's own checks", async () => {
    const url = await destinationOf(() =>
      submitReview(form({ bookingId, ...valid, text: "норм" })),
    );
    expect(url).toContain("review=invalid");
    expect(await reviewRepository.byBooking(bookingId)).toBeUndefined();
  });

  it("does not file a second review for the same booking", async () => {
    await destinationOf(() => submitReview(form({ bookingId, ...valid })));
    const first = await reviewRepository.byBooking(bookingId);

    await destinationOf(() =>
      submitReview(form({ bookingId, ...valid, text: "Зовсім інший текст." })),
    );

    expect(await reviewRepository.byBooking(bookingId)).toStrictEqual(first);
  });
});

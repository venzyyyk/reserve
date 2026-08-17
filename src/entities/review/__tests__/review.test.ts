import { describe, expect, it } from "vitest";
import { canReview, distribution, summarise, type Review } from "../index";

const review = (over: Partial<Review> = {}): Review => ({
  id: "r1",
  clubId: "c1",
  clubName: "Клуб",
  authorName: "Гість",
  verified: true,
  rating: 5,
  text: "Добре",
  status: "published",
  createdAt: new Date().toISOString(),
  ...over,
});

describe("summarise", () => {
  it("returns nothing to show when there are no published reviews", () => {
    expect(summarise([])).toEqual({ average: 0, count: 0 });
    expect(summarise([review({ status: "pending" })])).toEqual({
      average: 0,
      count: 0,
    });
  });

  it("ignores pending and rejected reviews in the average", () => {
    const summary = summarise([
      review({ id: "a", rating: 5 }),
      review({ id: "b", rating: 3 }),
      review({ id: "c", rating: 1, status: "pending" }),
      review({ id: "d", rating: 1, status: "rejected" }),
    ]);
    expect(summary).toEqual({ average: 4, count: 2 });
  });

  it("rounds to one decimal so the same number prints everywhere", () => {
    const summary = summarise([
      review({ id: "a", rating: 5 }),
      review({ id: "b", rating: 4 }),
      review({ id: "c", rating: 4 }),
    ]);
    expect(summary.average).toBe(4.3);
  });
});

describe("distribution", () => {
  it("counts from five down to one, including empty rows", () => {
    const bars = distribution([
      review({ id: "a", rating: 5 }),
      review({ id: "b", rating: 5 }),
      review({ id: "c", rating: 2 }),
      review({ id: "d", rating: 1, status: "pending" }),
    ]);
    expect(bars).toEqual([
      [5, 2],
      [4, 0],
      [3, 0],
      [2, 1],
      [1, 0],
    ]);
  });
});

describe("canReview", () => {
  const at = (iso: string) => new Date(iso);

  it("opens only after the table time has passed", () => {
    const booking = { status: "confirmed", date: "2026-07-31", end: 22 * 60 };
    expect(canReview(booking, at("2026-07-31T21:00:00"))).toBe(false);
    expect(canReview(booking, at("2026-07-31T22:01:00"))).toBe(true);
    expect(canReview(booking, at("2026-08-02T10:00:00"))).toBe(true);
  });

  it("handles a session running past midnight", () => {
    // 01:30 the following day, expressed as minutes from the booking date.
    const booking = { status: "confirmed", date: "2026-07-31", end: 25 * 60.5 };
    expect(canReview(booking, at("2026-08-01T00:30:00"))).toBe(false);
    expect(canReview(booking, at("2026-08-01T02:00:00"))).toBe(true);
  });

  it("is closed for anything that is not a confirmed booking", () => {
    for (const status of ["held", "awaiting_payment", "cancelled", "expired"]) {
      expect(
        canReview(
          { status, date: "2020-01-01", end: 60 },
          at("2026-07-31T12:00:00"),
        ),
      ).toBe(false);
    }
  });
});

import { describe, expect, it } from "vitest";
import { reviewRepository } from "../repository";
import { reviewInputSchema } from "../schema";

describe("reviewRepository", () => {
  it("files a new review as pending, never straight to the club page", async () => {
    const created = await reviewRepository.create({
      clubId: "clb_kyiv_klasyk",
      clubName: "Класик",
      bookingId: "bk_test_1",
      authorName: "Тарас",
      rating: 5,
      text: "Столи рівні, кий не веде.",
    });

    expect(created.status).toBe("pending");
    expect(created.verified).toBe(true);
    expect(
      (await reviewRepository.listPublished("clb_kyiv_klasyk")).map(
        (review) => review.id,
      ),
    ).not.toContain(created.id);
  });

  it("keeps one review per booking, so a double submit is not two entries", async () => {
    const input = {
      clubId: "clb_kyiv_klasyk",
      clubName: "Класик",
      bookingId: "bk_test_2",
      authorName: "Оксана",
      rating: 4 as const,
      text: "Гарний вечір, трохи шумно.",
    };

    const first = await reviewRepository.create(input);
    const second = await reviewRepository.create({ ...input, text: "Інше" });

    expect(second.id).toBe(first.id);
    expect(second.text).toBe(first.text);
    expect(await reviewRepository.byBooking("bk_test_2")).toStrictEqual(first);
  });

  it("shows a review publicly only once it is published", async () => {
    const created = await reviewRepository.create({
      clubId: "clb_lviv_ratusha",
      clubName: "Ратуша",
      bookingId: "bk_test_3",
      authorName: "Ігор",
      rating: 5,
      text: "Найкраще сукно у Львові, без перебільшення.",
    });

    await reviewRepository.moderate(created.id, "published");
    const shown = await reviewRepository.listPublished("clb_lviv_ratusha");
    expect(shown.map((review) => review.id)).toContain(created.id);

    await reviewRepository.moderate(created.id, "rejected");
    const after = await reviewRepository.listPublished("clb_lviv_ratusha");
    expect(after.map((review) => review.id)).not.toContain(created.id);
  });

  it("only returns reviews for the club that was asked for", async () => {
    const shown = await reviewRepository.listPublished("clb_kyiv_klasyk");
    expect(shown.every((review) => review.clubId === "clb_kyiv_klasyk")).toBe(
      true,
    );
  });
});

describe("reviewInputSchema", () => {
  const valid = {
    rating: "5",
    authorName: "Тарас",
    text: "Достатньо довгий відгук про клуб.",
  };

  it("coerces the rating that arrives from a form as a string", () => {
    expect(reviewInputSchema.parse(valid).rating).toBe(5);
  });

  it("rejects a one-word review and an out-of-range rating", () => {
    expect(
      reviewInputSchema.safeParse({ ...valid, text: "норм" }).success,
    ).toBe(false);
    expect(reviewInputSchema.safeParse({ ...valid, rating: "6" }).success).toBe(
      false,
    );
    expect(
      reviewInputSchema.safeParse({ ...valid, authorName: " " }).success,
    ).toBe(false);
  });

  it("trims what it stores, so names do not arrive padded", () => {
    expect(
      reviewInputSchema.parse({ ...valid, authorName: "  Тарас  " }).authorName,
    ).toBe("Тарас");
  });
});

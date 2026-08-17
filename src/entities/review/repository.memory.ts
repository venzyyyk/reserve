import "server-only";

import { processMap, processMutex } from "@/shared/lib/process-store";

import type { Rating, Review, ReviewStatus } from "./index";
import type { ReviewRepository } from "./ports";

const exclusive = processMutex("reviews");

const seeded: Review[] = [
  {
    id: "rev_1",
    clubId: "clb_kyiv_klasyk",
    clubName: "Класик",
    authorName: "Олег К.",
    verified: true,
    rating: 5,
    text: "Столи в ідеальному стані, сукно нове. Адміністратор допоміг підібрати кий.",
    status: "published",
    createdAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
  },
  {
    id: "rev_2",
    clubId: "clb_kyiv_abrikol",
    clubName: "Абріколь",
    authorName: "Ірина",
    verified: true,
    rating: 4,
    text: "Гарна музика і кухня, але ввечері шумно біля бару.",
    status: "published",
    createdAt: new Date(Date.now() - 20 * 3600_000).toISOString(),
  },
  {
    id: "rev_3",
    clubId: "clb_lviv_ratusha",
    clubName: "Ратуша",
    authorName: "Анонім",
    verified: false,
    rating: 1,
    text: "ЖАХ!!! не раджу нікому, краще йдіть у сусідній заклад за посиланням",
    status: "pending",
    createdAt: new Date(Date.now() - 40 * 60_000).toISOString(),
  },
];
const reviews = processMap<Review>("reviews", () =>
  seeded.map((review) => [review.id, review] as const),
);

/** Development and unit-test adapter. */
export const memoryReviewRepository: ReviewRepository = {
  async list(status?: ReviewStatus): Promise<Review[]> {
    return exclusive(() =>
      [...reviews.values()]
        .filter((review) => !status || review.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  /** Published reviews for one club, newest first. */
  async listPublished(clubId: string): Promise<Review[]> {
    return exclusive(() =>
      [...reviews.values()]
        .filter(
          (review) => review.clubId === clubId && review.status === "published",
        )
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  /**
   * All published reviews, for aggregates the catalogue needs. Cheap while
   * this is a Map; becomes a grouped query against Postgres in M2b.
   */
  async allPublished(): Promise<Review[]> {
    return exclusive(() =>
      [...reviews.values()].filter((review) => review.status === "published"),
    );
  },

  async byBooking(bookingId: string): Promise<Review | undefined> {
    return exclusive(() =>
      [...reviews.values()].find((review) => review.bookingId === bookingId),
    );
  },

  /**
   * Files a review for moderation. One per booking: a second submit — a
   * double tap, a reloaded ticket — returns the review already on file
   * rather than filling the queue with the same text twice.
   */
  async create(input: {
    clubId: string;
    clubName: string;
    bookingId: string;
    authorName: string;
    rating: Rating;
    text: string;
  }): Promise<Review> {
    return exclusive(() => {
      const existing = [...reviews.values()].find(
        (review) => review.bookingId === input.bookingId,
      );
      if (existing) return existing;

      const review: Review = {
        id: `rev_${crypto.randomUUID().slice(0, 8)}`,
        clubId: input.clubId,
        clubName: input.clubName,
        bookingId: input.bookingId,
        authorName: input.authorName,
        // Written from a paid booking, so the badge is earned by construction.
        verified: true,
        rating: input.rating,
        text: input.text,
        status: "pending",
        createdAt: new Date().toISOString(),
      };
      reviews.set(review.id, review);
      return review;
    });
  },

  async moderate(
    id: string,
    status: Exclude<ReviewStatus, "pending">,
  ): Promise<Review | null> {
    return exclusive(() => {
      const review = reviews.get(id);
      if (!review) return null;
      const moderated: Review = {
        ...review,
        status,
        moderatedAt: new Date().toISOString(),
      };
      reviews.set(id, moderated);
      return moderated;
    });
  },

  async countPending(): Promise<number> {
    return exclusive(
      () =>
        [...reviews.values()].filter((review) => review.status === "pending")
          .length,
    );
  },
};

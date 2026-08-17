/**
 * Reviews are written by guests who actually played: the form lives on the
 * ticket, and a ticket only exists after a paid, confirmed booking. That
 * constraint is the product decision — it is why "Бронював" on a review
 * means something, and why the moderation queue stays small enough for a
 * person to read.
 */
export type ReviewStatus = "pending" | "published" | "rejected";

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Review {
  id: string;
  clubId: string;
  clubName: string;
  authorName: string;
  /** Verified means the author actually had a completed booking. */
  verified: boolean;
  rating: Rating;
  text: string;
  status: ReviewStatus;
  createdAt: string;
  moderatedAt?: string;
  /** The booking that earned the right to write it. One review per booking. */
  bookingId?: string;
}

export interface RatingSummary {
  /** Mean of published ratings, to one decimal. 0 when there are none. */
  average: number;
  count: number;
}

/**
 * Aggregate for a club header. Rounding happens once, here, so "4.7" is
 * the same number everywhere it is printed.
 */
export function summarise(reviews: readonly Review[]): RatingSummary {
  const published = reviews.filter((review) => review.status === "published");
  if (published.length === 0) return { average: 0, count: 0 };

  const total = published.reduce((sum, review) => sum + review.rating, 0);
  return {
    average: Math.round((total / published.length) * 10) / 10,
    count: published.length,
  };
}

/** Counts from 5 down to 1, for the distribution bars. */
export function distribution(reviews: readonly Review[]): [Rating, number][] {
  const published = reviews.filter((review) => review.status === "published");
  const ratings: Rating[] = [5, 4, 3, 2, 1];
  return ratings.map((rating) => [
    rating,
    published.filter((review) => review.rating === rating).length,
  ]);
}

/**
 * A guest may write once the table time has passed — reviewing a session
 * that has not happened yet is noise, and the ticket is on screen from the
 * moment of payment.
 */
export function canReview(
  booking: { status: string; date: string; end: number },
  now: Date = new Date(),
): boolean {
  if (booking.status !== "confirmed") return false;
  const ended = new Date(`${booking.date}T00:00:00`);
  ended.setMinutes(ended.getMinutes() + booking.end);
  return ended.getTime() <= now.getTime();
}

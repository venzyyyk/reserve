import "server-only";

import type { Review } from "./index";
import { reviewRepository } from "./repository";

/**
 * Published reviews for a club page, or none if the store cannot answer.
 *
 * Two things are true at once here. Bookings and payments must never
 * degrade: if the database is missing, that request has to fail loudly,
 * and it does. But a club page is editorial content that renders perfectly
 * well without its reviews section — a guest looking for opening hours and
 * a phone number should not get an error page because a read-only section
 * is unavailable.
 *
 * It also keeps `next build` honest. The club pages are prerendered, and a
 * build machine without a database now produces pages with an empty reviews
 * section instead of failing — the reviews appear on the first
 * revalidation, and publishing one revalidates the page directly.
 *
 * Scope is the point: this is used by one read-only section. Nothing
 * transactional is allowed to swallow a storage failure.
 */
export async function publishedReviewsOrNone(
  clubId: string,
): Promise<Review[]> {
  try {
    return await reviewRepository.listPublished(clubId);
  } catch (error) {
    // Never the connection string, and never silent.
    console.warn(
      `Reviews unavailable for ${clubId}; rendering the club page without them.`,
      error instanceof Error ? error.name : "Error",
    );
    return [];
  }
}

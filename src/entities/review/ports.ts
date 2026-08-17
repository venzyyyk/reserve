import type { Rating, Review, ReviewStatus } from "./index";

export interface CreateReviewInput {
  clubId: string;
  clubName: string;
  bookingId: string;
  authorName: string;
  rating: Rating;
  text: string;
}

/** Unchanged by M2b — the memory and MongoDB adapters both satisfy it. */
export interface ReviewRepository {
  list(status?: ReviewStatus): Promise<Review[]>;
  listPublished(clubId: string): Promise<Review[]>;
  allPublished(): Promise<Review[]>;
  byBooking(bookingId: string): Promise<Review | undefined>;
  create(input: CreateReviewInput): Promise<Review>;
  moderate(
    id: string,
    status: Exclude<ReviewStatus, "pending">,
  ): Promise<Review | null>;
  countPending(): Promise<number>;
}

import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type { Review, ReviewStatus } from "./index";
import type { CreateReviewInput, ReviewRepository } from "./ports";

/**
 * MongoDB review adapter.
 *
 * The moderation contract is unchanged: a review arrives pending and only
 * a person moves it. What changes is that "one review per booking" is now
 * enforced by a unique index rather than by a read followed by a write —
 * two submits of the same ticket race in a way the in-memory mutex hid.
 */
const reviews = () => collection<Review>(COLLECTIONS.reviews);
const withoutId = { projection: { _id: 0 } } as const;

export const mongoReviewRepository: ReviewRepository = {
  async list(status?: ReviewStatus) {
    const documents = await reviews();
    return documents
      .find(status ? { status } : {}, withoutId)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async listPublished(clubId: string) {
    const documents = await reviews();
    return documents
      .find({ clubId, status: "published" }, withoutId)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async allPublished() {
    const documents = await reviews();
    return documents.find({ status: "published" }, withoutId).toArray();
  },

  async byBooking(bookingId: string) {
    const documents = await reviews();
    const found = await documents.findOne({ bookingId }, withoutId);
    return found ?? undefined;
  },

  async create(input: CreateReviewInput) {
    const documents = await reviews();
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

    try {
      await documents.insertOne({ ...review });
      return review;
    } catch (error) {
      // Unique on bookingId: a second submit returns the review on file
      // instead of filling the queue with the same text twice.
      const existing = await documents.findOne(
        { bookingId: input.bookingId },
        withoutId,
      );
      if (existing) return existing;
      throw error;
    }
  },

  async moderate(id: string, status: Exclude<ReviewStatus, "pending">) {
    const documents = await reviews();
    return documents.findOneAndUpdate(
      { id },
      { $set: { status, moderatedAt: new Date().toISOString() } },
      { returnDocument: "after", ...withoutId },
    );
  },

  async countPending() {
    const documents = await reviews();
    return documents.countDocuments({ status: "pending" });
  },
};

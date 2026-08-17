import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryReviewRepository } from "./repository.memory";
import { mongoReviewRepository } from "./repository.mongo";
import type { ReviewRepository } from "./ports";

export type { CreateReviewInput, ReviewRepository } from "./ports";

/** MongoDB when configured, in memory otherwise. See `shared/db/storage`. */
export const reviewRepository: ReviewRepository = selectAdapter({
  mongodb: () => mongoReviewRepository,
  memory: () => memoryReviewRepository,
});

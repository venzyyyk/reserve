import { selectAdapter } from "@/shared/db/storage";
import { memoryClubRepository } from "./repository.memory";
import { mongoClubRepository } from "./repository.mongo";
import type { ClubRepository } from "./ports";

export type { ClubRepository } from "./ports";

/**
 * Clubs, from MongoDB when configured and from the content file otherwise
 * (ADR-0004 seam, unchanged; M6 gave it a writable adapter).
 */
export const clubRepository: ClubRepository = selectAdapter({
  mongodb: () => mongoClubRepository,
  memory: () => memoryClubRepository,
});

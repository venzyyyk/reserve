import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryApplicationRepository } from "./repository.memory";
import { mongoApplicationRepository } from "./repository.mongo";
import type { ApplicationRepository } from "./ports";

export type { ApplicationRepository } from "./ports";

/** MongoDB when configured, in memory otherwise. See `shared/db/storage`. */
export const applicationRepository: ApplicationRepository = selectAdapter({
  mongodb: () => mongoApplicationRepository,
  memory: () => memoryApplicationRepository,
});

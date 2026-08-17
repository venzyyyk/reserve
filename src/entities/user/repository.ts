import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryUserRepository } from "./repository.memory";
import { mongoUserRepository } from "./repository.mongo";
import type { UserRepository } from "./ports";

export type { UserRepository } from "./ports";

/** MongoDB when configured, in memory otherwise. See `shared/db/storage`. */
export const userRepository: UserRepository = selectAdapter({
  mongodb: () => mongoUserRepository,
  memory: () => memoryUserRepository,
});

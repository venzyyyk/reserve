import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryBillingRepository } from "./repository.memory";
import { mongoBillingRepository } from "./repository.mongo";
import type { BillingRepository } from "./ports";

export type { BillingRepository, PlacementEdit, PlanEdit } from "./ports";

/** MongoDB when configured, in memory otherwise. See `shared/db/storage`. */
export const billingRepository: BillingRepository = selectAdapter({
  mongodb: () => mongoBillingRepository,
  memory: () => memoryBillingRepository,
});

import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryAnalyticsRepository } from "./repository.memory";
import { mongoAnalyticsRepository } from "./repository.mongo";
import type { AnalyticsRepository } from "./ports";
import type { AnalyticsEvent } from "./model";

export type { AnalyticsRepository } from "./ports";

/** MongoDB when configured, in memory otherwise. See `shared/db/storage`. */
export const analyticsRepository: AnalyticsRepository = selectAdapter({
  mongodb: () => mongoAnalyticsRepository,
  memory: () => memoryAnalyticsRepository,
});

/**
 * Records an event and never lets it matter.
 *
 * Counting is the least important thing happening on any request it is part
 * of. A slow or broken analytics write must not delay a booking and must
 * never fail one — so this swallows, logs, and moves on. If the counter is
 * down we lose a number; if it could throw, we would lose a table.
 */
export async function recordEvent(
  event: Omit<AnalyticsEvent, "at"> & { at?: string },
): Promise<void> {
  try {
    await analyticsRepository.record({
      at: event.at ?? new Date().toISOString(),
      ...event,
    });
  } catch (error) {
    console.warn(
      "analytics: event dropped",
      event.name,
      error instanceof Error ? error.name : "Error",
    );
  }
}

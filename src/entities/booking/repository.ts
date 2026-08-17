import "server-only";

import { selectAdapter } from "@/shared/db/storage";
import { memoryBookingRepository } from "./repository.memory";
import { mongoBookingRepository } from "./repository.mongo";
import type { BookingRepository } from "./ports";

export type { BookingRepository, CreateHoldInput, HoldResult } from "./ports";

/**
 * The booking repository the product uses.
 *
 * Which adapter answers is decided by configuration, not by what happens to
 * be reachable: MongoDB when `MONGODB_URI` is set, in memory otherwise, and
 * a production build with no URI refuses to start rather than pretend that
 * bookings are durable (ADR-0004, ADR-0009).
 */
export const bookingRepository: BookingRepository = selectAdapter({
  mongodb: () => mongoBookingRepository,
  memory: () => memoryBookingRepository,
});

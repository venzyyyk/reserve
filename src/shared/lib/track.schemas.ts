import { z } from "zod";
import type { EventMap } from "./track";

/**
 * Development-only runtime contract for the analytics bus. Loaded lazily by
 * `track()`, never bundled into production. `satisfies` ties each schema to
 * its TypeScript counterpart, so drift is a compile error.
 */
export const eventSchemas = {
  page_viewed: z.object({ path: z.string() }),
  cta_clicked: z.object({ id: z.string(), context: z.string().optional() }),
  booking_step_reached: z.object({
    step: z.enum(["where", "table", "time", "payment", "confirmed"]),
    clubId: z.string().optional(),
  }),
  recommendation_swap_accepted: z.object({
    fromTableId: z.string(),
    toTableId: z.string(),
  }),
} satisfies { [N in keyof EventMap]: z.ZodType<EventMap[N]> };

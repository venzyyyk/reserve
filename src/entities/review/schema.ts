import { z } from "zod";

/**
 * A review is short by design: the field is capped at a length a person
 * will actually read on a phone, and the floor is high enough that "норм"
 * does not reach the queue.
 */
export const reviewInputSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5),
  authorName: z.string().trim().min(2).max(40),
  text: z.string().trim().min(20).max(600),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;

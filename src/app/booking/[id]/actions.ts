"use server";

import { redirect } from "next/navigation";
import { bookingRepository } from "@/entities/booking/repository";
import { clubRepository } from "@/entities/club/repository";
import { canReview, type Rating } from "@/entities/review";
import { reviewRepository } from "@/entities/review/repository";
import { reviewInputSchema } from "@/entities/review/schema";
import type { ReviewOutcome } from "@/features/review/model";

/**
 * Files a review against a booking.
 *
 * The booking id is the authorisation: a random UUID shown only to the
 * guest who paid. Eligibility is re-derived here rather than trusted from
 * the form — the page decides whether to render the form, but the page is
 * not what decides whether the review counts.
 *
 * The outcome comes back in the URL because the form ships no JavaScript.
 * That also makes the result survive a refresh, and a redirect after POST
 * means the browser will not offer to resubmit it.
 */
export async function submitReview(formData: FormData): Promise<void> {
  const bookingId = String(formData.get("bookingId") ?? "");
  const back = (outcome: ReviewOutcome) =>
    `/booking/${encodeURIComponent(bookingId)}?review=${outcome}`;

  const booking = await bookingRepository.byId(bookingId);
  if (!booking || !canReview(booking)) return redirect(back("notAllowed"));

  const parsed = reviewInputSchema.safeParse({
    rating: formData.get("rating"),
    authorName: formData.get("authorName"),
    text: formData.get("text"),
  });
  if (!parsed.success) return redirect(back("invalid"));

  const club = await clubRepository.byId(booking.clubId);
  if (!club) return redirect(back("notAllowed"));

  await reviewRepository.create({
    clubId: club.id,
    clubName: club.name,
    bookingId: booking.id,
    authorName: parsed.data.authorName,
    rating: parsed.data.rating as Rating,
    text: parsed.data.text,
  });

  redirect(back("sent"));
}

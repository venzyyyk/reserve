/**
 * The contract between the review form and the route that owns its action.
 * It lives in the feature rather than next to the action because `features`
 * may not import from `app` (ADR-0001).
 */
export type ReviewFormAction = (formData: FormData) => Promise<void>;

/** Outcome carried back in the URL, since the form ships no JavaScript. */
export type ReviewOutcome = "sent" | "invalid" | "notAllowed";

export function isReviewOutcome(value: unknown): value is ReviewOutcome {
  return value === "sent" || value === "invalid" || value === "notAllowed";
}

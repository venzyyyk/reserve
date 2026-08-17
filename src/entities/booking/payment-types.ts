/**
 * Payment vocabulary, separate from both the PSP boundary and the store so
 * that neither has to import the other to name a status.
 */
export type PaymentMethod = "card" | "apple_pay" | "google_pay" | "monobank";

export type PaymentStatus = "pending" | "succeeded" | "failed";

export interface Payment {
  id: string;
  bookingId: string;
  /** Integer kopiykas — server-computed, never taken from the client. */
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  /** Set when status is "failed" — surfaced to the guest, in Ukrainian. */
  failureReason?: string;
}

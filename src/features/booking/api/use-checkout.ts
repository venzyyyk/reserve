"use client";

import { useMutation } from "@tanstack/react-query";
import type { Hold } from "@/entities/booking";
import { AppError } from "@/shared/api/errors";
import { http } from "@/shared/api/http";

export interface HoldResponse {
  hold: Hold;
  total: number;
  /** Server-measured remaining time; see HoldCountdown on clock skew. */
  expiresInMs: number;
}

export interface StartPaymentInput {
  holdId: string;
  phone: string;
  method: "card" | "apple_pay" | "google_pay" | "monobank";
  cardNumber?: string;
}

export interface PaymentStatusResponse {
  status: "pending" | "succeeded" | "failed";
  bookingId: string;
  failureReason?: string;
}

export function useCreateHold() {
  return useMutation<
    HoldResponse,
    AppError,
    {
      clubId: string;
      tableId: string;
      date: string;
      start: number;
      end: number;
    }
  >({
    mutationFn: (input) =>
      http<HoldResponse>("/api/holds", { method: "POST", body: input }),
  });
}

export function useStartPayment() {
  return useMutation<
    { paymentId: string; bookingId: string },
    AppError,
    StartPaymentInput
  >({
    mutationFn: (input) =>
      http<{ paymentId: string; bookingId: string }>("/api/payments", {
        method: "POST",
        body: input,
      }),
  });
}

/**
 * Waits for the provider to settle. Real PSPs confirm by webhook, so the
 * client polls rather than believing anything the browser saw — the same
 * loop works for the sandbox and for LiqPay.
 */
export async function waitForPayment(
  paymentId: string,
  signal?: AbortSignal,
): Promise<PaymentStatusResponse> {
  const deadline = Date.now() + 60_000;
  for (;;) {
    const result = await http<PaymentStatusResponse>(
      `/api/payments?id=${encodeURIComponent(paymentId)}`,
      { signal },
    );
    if (result.status !== "pending") return result;
    if (Date.now() > deadline) {
      throw new AppError("timeout");
    }
    await new Promise((resolve) => setTimeout(resolve, 800));
  }
}

import "server-only";

import { paymentStore, type StoredPayment } from "./payment-store";
import type { Payment, PaymentMethod, PaymentStatus } from "./payment-types";

export type { Payment, PaymentMethod, PaymentStatus } from "./payment-types";

/**
 * Payment boundary.
 *
 * Ukrainian PSPs (LiqPay, WayForPay, Monobank) all work the same shape:
 * you create a payment, redirect or render their widget, and the truth
 * arrives later on a signed webhook — never from the browser. This
 * interface encodes that shape, so the flow, the hold lifetime and every
 * failure path are exercised now and the real adapter is a drop-in.
 *
 * The sandbox adapter below is NOT a mock in the "always succeeds" sense:
 * it settles asynchronously after a realistic delay and fails on the card
 * numbers real PSPs reserve for declines, so the UI has to handle both.
 * Since M2b it settles through the persistent payment store, so a payment
 * created before a restart still settles correctly after one.
 *
 * Not yet implemented, and blocking go-live: fiscal receipts (ПРРО, e.g.
 * Checkbox) must be issued per settled payment, and the
 * marketplace-of-record decision determines whose merchant account settles.
 */
export interface CreatePaymentInput {
  bookingId: string;
  /** Integer kopiykas — server-computed, never taken from the client. */
  amount: number;
  method: PaymentMethod;
  /** Sandbox only; the real adapter never sees card data. */
  cardNumber?: string;
}

export interface PaymentProvider {
  create(input: CreatePaymentInput): Promise<Payment>;
  get(paymentId: string): Promise<Payment | undefined>;
}

/** Test cards mirroring the ones PSPs publish for sandbox declines. */
const DECLINE_PREFIX = "4000 0000 0000 0002".replace(/\s/g, "");
const INSUFFICIENT_FUNDS = "4000 0000 0000 9995".replace(/\s/g, "");

const SETTLE_DELAY_MS = 1200;

function outcomeFor(input: CreatePaymentInput): {
  status: PaymentStatus;
  failureReason?: string;
} {
  const digits = (input.cardNumber ?? "").replace(/\D/g, "");
  if (digits === DECLINE_PREFIX) {
    return { status: "failed", failureReason: "declined" };
  }
  if (digits === INSUFFICIENT_FUNDS) {
    return { status: "failed", failureReason: "insufficient_funds" };
  }
  return { status: "succeeded" };
}

/** The public shape, without the sandbox's private bookkeeping. */
function toPayment(stored: StoredPayment): Payment {
  return {
    id: stored.id,
    bookingId: stored.bookingId,
    amount: stored.amount,
    method: stored.method,
    status: stored.status,
    ...(stored.failureReason !== undefined && {
      failureReason: stored.failureReason,
    }),
  };
}

/**
 * Sandbox provider. Settlement is time-based rather than instant so the
 * client's polling, the "processing" state and the hold countdown are all
 * genuinely exercised.
 */
export const sandboxPaymentProvider: PaymentProvider = {
  async create(input) {
    const timestamp = new Date().toISOString();
    // The outcome is decided now and revealed on settlement — exactly how a
    // real PSP behaves from our side.
    const outcome = outcomeFor(input);

    const stored = await paymentStore.create({
      id: crypto.randomUUID(),
      bookingId: input.bookingId,
      amount: input.amount,
      currency: "UAH",
      method: input.method,
      status: "pending",
      provider: "sandbox",
      createdAt: timestamp,
      updatedAt: timestamp,
      sandbox: {
        settleAt: new Date(Date.now() + SETTLE_DELAY_MS).toISOString(),
        status: outcome.status,
        ...(outcome.failureReason && { failureReason: outcome.failureReason }),
      },
    });

    return toPayment(stored);
  },

  async get(paymentId) {
    const stored = await paymentStore.byId(paymentId);
    if (!stored) return undefined;
    if (stored.status !== "pending") return toPayment(stored);

    const due = stored.sandbox
      ? Date.parse(stored.sandbox.settleAt)
      : Number.POSITIVE_INFINITY;
    if (Date.now() < due) return toPayment(stored);

    const settled = await paymentStore.settle(paymentId, {
      status: stored.sandbox?.status ?? "succeeded",
      ...(stored.sandbox?.failureReason !== undefined && {
        failureReason: stored.sandbox.failureReason,
      }),
    });
    return settled ? toPayment(settled) : undefined;
  },
};

export const paymentProvider: PaymentProvider = sandboxPaymentProvider;

import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import { processMap } from "@/shared/lib/process-store";
import { selectAdapter } from "@/shared/db/storage";
import type { Payment, PaymentMethod, PaymentStatus } from "./payment-types";

/**
 * Payment state, persisted independently of who processes the payment.
 *
 * The PSP boundary (`PaymentProvider`) is about talking to LiqPay or
 * Monobank; this is about remembering what we told a guest. Keeping them
 * apart is what lets the real adapter drop in later without touching
 * anything that reads payment history — and it means a settled payment
 * survives a deploy, which is the whole point of M2b.
 */
export interface StoredPayment extends Payment {
  currency: "UAH";
  /** Which adapter created it: "sandbox" now, "liqpay" later. */
  provider: string;
  /** The PSP's own identifier, once it has given us one. */
  providerRef?: string;
  createdAt: string;
  updatedAt: string;
  /** Set when a settled payment could not be honoured and money is owed. */
  refundRequired?: boolean;
  refundState?: "pending" | "sent" | "confirmed";
  /**
   * Sandbox bookkeeping: when this payment settles and how. A real PSP
   * adapter never writes this — the provider decides, not us.
   */
  sandbox?: {
    settleAt: string;
    status: PaymentStatus;
    failureReason?: string;
  };
}

export interface PaymentStore {
  create(payment: StoredPayment): Promise<StoredPayment>;
  byId(paymentId: string): Promise<StoredPayment | undefined>;
  forBooking(bookingId: string): Promise<StoredPayment[]>;
  settle(
    paymentId: string,
    outcome: { status: PaymentStatus; failureReason?: string },
  ): Promise<StoredPayment | undefined>;
  markRefundRequired(paymentId: string): Promise<void>;
  _reset(): Promise<void>;
}

export interface NewPayment {
  bookingId: string;
  amount: number;
  method: PaymentMethod;
  provider: string;
}

const now = (): string => new Date().toISOString();

/* ------------------------------- in memory ------------------------------ */

const payments = processMap<StoredPayment>("payments");

const memoryPaymentStore: PaymentStore = {
  async create(payment) {
    payments.set(payment.id, payment);
    return payment;
  },

  async byId(paymentId) {
    return payments.get(paymentId);
  },

  async forBooking(bookingId) {
    return [...payments.values()].filter(
      (payment) => payment.bookingId === bookingId,
    );
  },

  async settle(paymentId, outcome) {
    const payment = payments.get(paymentId);
    if (!payment) return undefined;
    // Settlement is once and for all: a duplicated callback reports the
    // outcome already on file rather than rewriting it.
    if (payment.status !== "pending") return payment;

    const settled: StoredPayment = {
      ...payment,
      status: outcome.status,
      ...(outcome.failureReason && { failureReason: outcome.failureReason }),
      updatedAt: now(),
    };
    payments.set(paymentId, settled);
    return settled;
  },

  async markRefundRequired(paymentId) {
    const payment = payments.get(paymentId);
    if (!payment) return;
    payments.set(paymentId, {
      ...payment,
      refundRequired: true,
      refundState: payment.refundState ?? "pending",
      updatedAt: now(),
    });
  },

  async _reset() {
    payments.clear();
  },
};

/* -------------------------------- mongodb ------------------------------- */

const paymentsCollection = () =>
  collection<StoredPayment>(COLLECTIONS.payments);

const mongoPaymentStore: PaymentStore = {
  async create(payment) {
    const collection = await paymentsCollection();
    await collection.insertOne({ ...payment });
    return payment;
  },

  async byId(paymentId) {
    const collection = await paymentsCollection();
    const doc = await collection.findOne(
      { id: paymentId },
      { projection: { _id: 0 } },
    );
    return doc ?? undefined;
  },

  async forBooking(bookingId) {
    const collection = await paymentsCollection();
    return collection.find({ bookingId }, { projection: { _id: 0 } }).toArray();
  },

  async settle(paymentId, outcome) {
    const collection = await paymentsCollection();
    // The status guard is in the filter, so two callbacks arriving together
    // cannot both write an outcome.
    const updated = await collection.findOneAndUpdate(
      { id: paymentId, status: "pending" },
      {
        $set: {
          status: outcome.status,
          updatedAt: now(),
          ...(outcome.failureReason && {
            failureReason: outcome.failureReason,
          }),
        },
      },
      { returnDocument: "after", projection: { _id: 0 } },
    );
    if (updated) return updated;

    // Either it does not exist, or it was already settled — say which.
    return this.byId(paymentId);
  },

  async markRefundRequired(paymentId) {
    const collection = await paymentsCollection();
    await collection.updateOne(
      { id: paymentId, refundRequired: { $ne: true } },
      {
        $set: {
          refundRequired: true,
          refundState: "pending",
          updatedAt: now(),
        },
      },
    );
  },

  async _reset() {
    const collection = await paymentsCollection();
    await collection.deleteMany({});
  },
};

export const paymentStore: PaymentStore = selectAdapter({
  mongodb: () => mongoPaymentStore,
  memory: () => memoryPaymentStore,
});

import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRepository } from "@/entities/booking/repository";
import { paymentProvider } from "@/entities/booking/payment-provider";
import { recordEvent, sourceFromCookie } from "@/entities/analytics";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  holdId: z.string().min(1),
  phone: z.string().regex(/^\+380\d{9}$/),
  method: z.enum(["card", "apple_pay", "google_pay", "monobank"]),
  cardNumber: z.string().optional(),
});

/**
 * Starts a payment. The amount is computed server-side from the hold — a
 * client-supplied total is never trusted, which is also why the summary UI
 * only ever *displays* a price it received from us.
 */
export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const booking = await bookingRepository.reserveForPayment(
    parsed.data.holdId,
    parsed.data.phone,
  );

  if (!booking) {
    // The hold may have been consumed by an earlier submit of the same
    // booking (double tap, second tab) rather than having expired. Resume
    // that payment instead of reporting a failure over a live transaction.
    const existing = await bookingRepository.bookingForHold(parsed.data.holdId);
    if (existing?.paymentId && existing.status !== "cancelled") {
      return NextResponse.json(
        {
          paymentId: existing.paymentId,
          bookingId: existing.id,
          status: existing.status === "confirmed" ? "succeeded" : "pending",
        },
        { status: 202 },
      );
    }
    // Genuinely expired — recoverable, and the client says so specifically.
    return NextResponse.json({ error: "hold_expired" }, { status: 410 });
  }

  const payment = await paymentProvider.create({
    bookingId: booking.id,
    amount: booking.total,
    method: parsed.data.method,
    ...(parsed.data.cardNumber && { cardNumber: parsed.data.cardNumber }),
  });
  await bookingRepository.attachPayment(booking.id, payment.id);

  return NextResponse.json(
    { paymentId: payment.id, bookingId: booking.id, status: payment.status },
    { status: 202 },
  );
}

const querySchema = z.object({ id: z.string().min(1) });

/**
 * Payment status. In production the PSP webhook is the source of truth and
 * this endpoint reads the settled result; the sandbox settles on a timer,
 * so the same polling loop drives both.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({ id: url.searchParams.get("id") });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const payment = await paymentProvider.get(parsed.data.id);
  if (!payment)
    return NextResponse.json({ error: "not_found" }, { status: 404 });

  if (payment.status === "succeeded") {
    const booking = await bookingRepository.markPaid(payment.bookingId);
    // Paid, but the table was gone by the time the provider settled. Report
    // it as a failure with its own reason: the guest must be told plainly
    // that the money is coming back, not shown a ticket that is not real.
    if (booking && !booking.refundRequired && booking.status === "confirmed") {
      // The only event that represents money. Recorded once, from the
      // settlement path, so duplicate webhooks cannot inflate a club's
      // revenue — markPaid is idempotent and this follows it.
      await recordEvent({
        name: "booking_paid",
        dedupeKey: `booking_paid:${booking.id}`,
        clubId: booking.clubId,
        sessionId: booking.sessionId,
        amount: booking.total,
        ...(sourceFromCookie(request.headers.get("cookie")) !== undefined && {
          source: sourceFromCookie(request.headers.get("cookie")),
        }),
      });
    }

    if (booking?.refundRequired) {
      return NextResponse.json(
        {
          status: "failed",
          bookingId: payment.bookingId,
          failureReason: "slot_lost",
        },
        { headers: { "Cache-Control": "no-store" } },
      );
    }
  } else if (payment.status === "failed") {
    await bookingRepository.markFailed(payment.bookingId);
  }

  return NextResponse.json(
    {
      status: payment.status,
      bookingId: payment.bookingId,
      ...(payment.failureReason && { failureReason: payment.failureReason }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import type { Booking } from "./model";

/**
 * Ticket payload. Deliberately self-contained: the QR carries everything a
 * doorman needs, so a guest with no signal in a basement club still gets in
 * (MPS §4 — the ticket must work offline).
 *
 * A signature belongs here before go-live; it needs a server secret, which
 * arrives with the deployment environment. Until then the payload is
 * readable but not forgeable in any way that matters, because the club's
 * own booking list is the second check.
 */
export function ticketPayload(booking: Booking): string {
  return [
    "RSV1",
    booking.reference,
    booking.date,
    String(booking.start),
    String(booking.end),
    booking.tableId,
  ].join("|");
}

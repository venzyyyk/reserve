import { NextResponse } from "next/server";
import { z } from "zod";
import { bookingRepository } from "@/entities/booking/repository";
import { sessionId } from "@/entities/booking/session";
import { recordEvent, sourceFromCookie } from "@/entities/analytics";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  clubId: z.string().min(1),
  tableId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  start: z.number().int().min(0).max(2880),
  end: z.number().int().min(0).max(2880),
});

export async function POST(request: Request) {
  const json: unknown = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success || parsed.data.end <= parsed.data.start) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  // Retrying a failed request must not create a second hold on the same slot.
  const idempotencyKey =
    request.headers.get("Idempotency-Key") ?? crypto.randomUUID();

  const result = await bookingRepository.hold({
    ...parsed.data,
    sessionId: await sessionId(),
    idempotencyKey,
  });

  if (result.ok) {
    // The middle of the funnel: somebody got as far as holding a table.
    // Counted here rather than on the client so an ad blocker cannot make
    // a club's numbers look worse than they are.
    await recordEvent({
      name: "booking_started",
      clubId: parsed.data.clubId,
      sessionId: result.hold.sessionId,
      ...(sourceFromCookie(request.headers.get("cookie")) !== undefined && {
        source: sourceFromCookie(request.headers.get("cookie")),
      }),
    });
  }

  if (!result.ok) {
    // 409 for "someone was faster" — the client offers alternatives rather
    // than a generic error.
    return NextResponse.json(
      { error: result.reason },
      { status: result.reason === "taken" ? 409 : 400 },
    );
  }

  // `expiresInMs` is sent alongside the absolute timestamp so the client can
  // count down without trusting the device clock — a phone set an hour slow
  // would otherwise show the hold as already expired.
  return NextResponse.json(
    {
      hold: result.hold,
      total: result.total,
      expiresInMs: Math.max(0, Date.parse(result.hold.expiresAt) - Date.now()),
    },
    { status: 201 },
  );
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const holdId = url.searchParams.get("id");
  if (!holdId) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }
  await bookingRepository.release(holdId);
  return new NextResponse(null, { status: 204 });
}

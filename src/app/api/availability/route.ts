import { NextResponse } from "next/server";
import { z } from "zod";
import { clubTables, openWindow, slotStarts } from "@/entities/booking";
import { bookingRepository } from "@/entities/booking/repository";
import { clubRepository } from "@/entities/club/repository";

/** Live availability must never be cached. */
export const dynamic = "force-dynamic";

const querySchema = z.object({
  clubId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = querySchema.safeParse({
    clubId: url.searchParams.get("clubId"),
    date: url.searchParams.get("date"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "validation" }, { status: 400 });
  }

  const club = await clubRepository.byId(parsed.data.clubId);
  if (!club) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const occupied = await bookingRepository.occupancyFor(
    club.id,
    parsed.data.date,
  );

  return NextResponse.json(
    {
      date: parsed.data.date,
      window: openWindow(club, parsed.data.date),
      slots: slotStarts(club, parsed.data.date),
      tables: clubTables(club),
      occupied,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

import { NextResponse } from "next/server";
import { bookingRepository } from "@/entities/booking/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const booking = await bookingRepository.byId(id);
  if (!booking) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  return NextResponse.json(booking, {
    headers: { "Cache-Control": "no-store" },
  });
}

import { NextResponse } from "next/server";
import { readSource, recordEvent } from "@/entities/analytics";
import { currentSessionId } from "@/entities/booking/session";

export const dynamic = "force-dynamic";

/**
 * The view counter.
 *
 * A club page is statically rendered and served from cache, so the server
 * never sees the visit — and we are not putting an analytics script on the
 * one part of the product that ships almost no JavaScript. A 1×1 image does
 * the job: the browser requests it, this handler counts it, and the page
 * itself stays static, cacheable and script-free.
 *
 * It also captures the campaign the visitor arrived on. UTM parameters live
 * in the URL of the *first* page they land on and are gone by the time they
 * book, so the first sighting is written to a cookie and travels with them
 * to checkout. Without that, every booking looks like it came from nowhere.
 */

/** A transparent 1×1 GIF — the smallest thing a browser will fetch. */
const PIXEL = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

const SOURCE_COOKIE = "rsv_src";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const clubId = url.searchParams.get("c") ?? undefined;

  const response = new NextResponse(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      // Never cached: a cached pixel is an uncounted visit.
      "Cache-Control": "no-store, max-age=0",
      "Content-Length": String(PIXEL.length),
    },
  });

  const incoming = readSource(url.searchParams);
  const known = request.headers
    .get("cookie")
    ?.match(/(?:^|;\s*)rsv_src=([^;]*)/)?.[1];
  const source = incoming ?? (known ? decodeURIComponent(known) : undefined);

  if (incoming && incoming !== (known && decodeURIComponent(known))) {
    // First touch wins for the session, but a genuinely new campaign
    // overwrites it — the last thing that actually brought them back.
    response.cookies.set(SOURCE_COOKIE, incoming, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
  }

  if (clubId) {
    const session = await currentSessionId();
    await recordEvent({
      name: "club_viewed",
      clubId,
      ...(source !== undefined && { source }),
      ...(session !== undefined && { sessionId: session }),
    });
  }

  return response;
}

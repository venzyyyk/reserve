import "server-only";

import { cookies } from "next/headers";

const COOKIE = "rsv_session";

/**
 * Anonymous session id. Booking works without an account (MPS §4: guest
 * checkout is on the critical path), so a hold needs *some* owner — this is
 * it. Upgraded to a real session when the guest verifies their phone.
 */
export async function sessionId(): Promise<string> {
  const store = await cookies();
  const existing = store.get(COOKIE)?.value;
  if (existing) return existing;

  const id = crypto.randomUUID();
  store.set(COOKIE, id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return id;
}

/**
 * Reads the session without creating one.
 *
 * A Server Component may not write cookies, and it should not want to:
 * somebody who has never booked has nothing to look up, and issuing them an
 * identifier just for visiting a page is tracking, not a feature.
 */
export async function currentSessionId(): Promise<string | undefined> {
  const store = await cookies();
  return store.get(COOKIE)?.value;
}

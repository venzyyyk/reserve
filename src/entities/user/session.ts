import "server-only";

import { cookies } from "next/headers";

/**
 * Super Admin gate.
 *
 * Deliberately minimal: a shared password from the environment and a signed
 * httpOnly cookie. The platform has no user accounts yet (booking is
 * guest-first by design), and inventing a full auth system to guard one
 * internal panel would be exactly the infrastructure we said we would not
 * build. What it must never be is absent — an open admin panel is not a
 * demo, it is an incident.
 *
 * When real staff accounts arrive, this module is the single place that
 * changes; every page asks it the same question.
 */
const COOKIE = "rsv_admin";

/** Dev default keeps the panel usable locally without setup. */
function expectedPassword(): string {
  return process.env.SUPERADMIN_PASSWORD ?? "reserve-dev";
}

/**
 * Not a password hash — a value that proves the password was known,
 * without storing the password itself in the browser.
 */
async function token(): Promise<string> {
  const data = new TextEncoder().encode(`rsv:${expectedPassword()}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function isSuperAdmin(): Promise<boolean> {
  const store = await cookies();
  const value = store.get(COOKIE)?.value;
  return value !== undefined && value === (await token());
}

export async function signIn(password: string): Promise<boolean> {
  if (password !== expectedPassword()) return false;
  const store = await cookies();
  store.set(COOKIE, await token(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export async function signOut(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

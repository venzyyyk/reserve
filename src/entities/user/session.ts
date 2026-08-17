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

/** Keeps the panel usable locally without setup. Never valid in production. */
const DEV_PASSWORD = "reserve-dev";

/**
 * The dev default is in this file, this file is on GitHub, and a forgotten
 * environment variable is the most ordinary mistake in deployment there is.
 * Together that means an open admin panel — anyone who reads the repository
 * would know the password to every booking, club and price on the platform.
 *
 * So production refuses the default rather than accepting it, the same way
 * `storage.ts` refuses to fall back to in-memory persistence. A deployment
 * that is missing a secret should fail loudly at the door it protects, not
 * serve happily with the lock unturned. Checked here, on the path that reads
 * the value, so a build without secrets configured still builds.
 */
function expectedPassword(): string {
  const configured = process.env.SUPERADMIN_PASSWORD;

  if (process.env.NODE_ENV === "production") {
    if (configured === undefined || configured === "") {
      throw new Error(
        "SUPERADMIN_PASSWORD is not set. The Super Admin panel has no other " +
          "lock, so this deployment refuses to open it.",
      );
    }
    if (configured === DEV_PASSWORD) {
      throw new Error(
        "SUPERADMIN_PASSWORD is still the development default, which is " +
          "public in the repository. Set a real one.",
      );
    }
  }

  return configured ?? DEV_PASSWORD;
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

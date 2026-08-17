import "server-only";

import { isMongoConfigured } from "@/shared/config/env";

export type StorageMode = "mongodb" | "memory";

/**
 * Which storage this process uses, decided once, from configuration only.
 *
 * The rule that matters is the one about *not* being clever: storage is
 * never chosen by trying MongoDB and falling back when it does not answer.
 * A production process that quietly degraded to memory would keep serving
 * pages, keep taking payments, and drop every booking on the next deploy —
 * the failure would surface as angry guests at a door, days later. So an
 * unreachable database raises an error on the request that needed it, and
 * a production build with no `MONGODB_URI` refuses to start at all.
 */
export function storageMode(): StorageMode {
  if (isMongoConfigured()) return "mongodb";

  // Building is not running. `next build` prerenders pages, and since M6
  // those pages read clubs, which now live in the database — so a build
  // machine with no database would fail rather than produce a site. It may
  // fall back to the content file: that file is version-controlled, is the
  // same data the seed inserts, and nothing is written during a build. Every
  // page is still regenerated on demand at runtime, where the guard below
  // applies in full.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    console.warn(
      "MONGODB_URI is not set during the build. Pages will be prerendered " +
        "from the content file and regenerated on first request.",
    );
    return "memory";
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "MONGODB_URI is not set. Reserve refuses to run in production on " +
        "in-memory storage, because bookings would not survive a restart. " +
        "Set MONGODB_URI (see docs/database.md).",
    );
  }
  return "memory";
}

/**
 * Picks an adapter and keeps using it.
 *
 * Resolution is deferred to the first call rather than done at import, so a
 * module graph that merely mentions a repository does not force a decision
 * — tests set the environment they want and then call.
 */
export function selectAdapter<T extends object>(
  adapters: Record<StorageMode, () => T>,
): T {
  let resolved: T | undefined;
  let resolvedFor: StorageMode | undefined;

  const current = (): T => {
    const mode = storageMode();
    if (resolved === undefined || resolvedFor !== mode) {
      resolved = adapters[mode]();
      resolvedFor = mode;
    }
    return resolved;
  };

  return new Proxy({} as T, {
    get(_target, property) {
      const value = current()[property as keyof T];
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(current())
        : value;
    },
  });
}

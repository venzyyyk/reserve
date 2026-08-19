import "server-only";

import { MongoClient, type Db } from "mongodb";
import { processStore } from "@/shared/lib/process-store";
import { databaseEnv, isMongoConfigured } from "@/shared/config/env";

/**
 * The one MongoClient for this process.
 *
 * The driver keeps its own connection pool, so a client is meant to be
 * created once and shared — a client per request would open a pool per
 * request. It is anchored on the process store for the same reason the
 * repositories are: `next dev` re-evaluates modules as it compiles, and a
 * module-level client would leak a pool on every recompile.
 *
 * Nothing here is importable from the browser: `server-only` fails the
 * build if a client component reaches for it, and the URI never leaves
 * this module.
 */
interface Connection {
  client: MongoClient;
  db: Db;
}

const state = processStore("mongo.connection", () => ({
  pending: undefined as Promise<Connection> | undefined,
}));

async function connect(): Promise<Connection> {
  const env = databaseEnv();
  const client = new MongoClient(env.MONGODB_URI, {
    // Fail fast and loudly. A booking site that hangs for 30 seconds while
    // the driver retries has already lost the guest; an error we can show
    // is better than a spinner.
    serverSelectionTimeoutMS: 5_000,
    retryWrites: true,
  });

  try {
    await client.connect();
  } catch (cause) {
    // The URI carries credentials. Whatever we say about a failed
    // connection, it must never be the connection string.
    throw new Error(
      "Could not connect to MongoDB. Check MONGODB_URI and that the server is reachable.",
      { cause: redactCause(cause) },
    );
  }

  return { client, db: client.db(env.MONGODB_DB_NAME) };
}

/**
 * Strips anything that might carry the URI out of a driver error, while
 * keeping the one field that says what actually went wrong.
 *
 * The driver's `message` can quote the connection string, so it is dropped.
 * `codeName` cannot: it is a fixed MongoDB identifier — `AuthenticationFailed`,
 * `Unauthorized`, `HostUnreachable`. The first version of this function threw
 * all of it away, and the difference between "MongoServerError" and
 * "MongoServerError (AuthenticationFailed)" was a deploy spent guessing
 * whether the password was wrong or the network was closed.
 */
function redactCause(cause: unknown): Error {
  const name = cause instanceof Error ? cause.name : "Error";
  const code = (cause as { codeName?: unknown } | null)?.codeName;
  const label =
    typeof code === "string" && /^[A-Za-z]+$/.test(code)
      ? `${name} (${code})`
      : name;
  return new Error(`${label} — details omitted: they may contain credentials`);
}

/**
 * The shared database handle. Concurrent callers during startup await the
 * same connection attempt rather than racing to open several.
 */
export async function mongoDb(): Promise<Db> {
  state.pending ??= connect().catch((error: unknown) => {
    // A failed attempt must not be cached forever: the next request should
    // be able to try again once the database comes back.
    state.pending = undefined;
    throw error;
  });
  return (await state.pending).db;
}

/** Closes the pool. Used by tests and by the seed script, not by the app. */
export async function closeMongo(): Promise<void> {
  const pending = state.pending;
  state.pending = undefined;
  if (!pending) return;
  try {
    const { client } = await pending;
    await client.close();
  } catch {
    // Already broken or never opened; nothing to close.
  }
}

export { isMongoConfigured };

import "server-only";

/**
 * A value that survives module re-evaluation within one server process.
 *
 * The in-memory adapters (ADR-0004) keep state in module-level Maps. That
 * is fine in production, where a module is evaluated once — but `next dev`
 * re-evaluates route modules as it compiles them on demand, so a Map
 * created at module scope is silently replaced between two requests. The
 * symptom is state that appears to save and then reverts: a booking made
 * through the API is missing when the ticket page renders it, an approved
 * application is pending again on the next paint.
 *
 * Anchoring the store on `globalThis` under a stable symbol gives every
 * evaluation of the module the same object, so behaviour in development
 * matches behaviour in production. It disappears entirely when the
 * repositories move to Postgres in M2b — a database is the real answer to
 * "where does state live"; this only makes the interim adapter honest.
 */
export function processStore<T>(key: string, create: () => T): T {
  const registry = globalThis as typeof globalThis & {
    __reserveStores?: Map<symbol, unknown>;
  };
  registry.__reserveStores ??= new Map<symbol, unknown>();

  const id = Symbol.for(`reserve.store.${key}`);
  const existing = registry.__reserveStores.get(id);
  if (existing !== undefined) return existing as T;

  const created = create();
  registry.__reserveStores.set(id, created);
  return created;
}

/** Convenience wrapper for the common case: a keyed collection. */
export function processMap<V>(
  key: string,
  seed?: () => Iterable<readonly [string, V]>,
): Map<string, V> {
  return processStore(key, () => new Map<string, V>(seed?.()));
}

/**
 * Serialises writes for one store. The mutex has to live in the same place
 * as the data it guards, or two module evaluations would each hold their
 * own lock and neither would exclude the other.
 */
export function processMutex(
  key: string,
): <T>(work: () => Promise<T> | T) => Promise<T> {
  const state = processStore(`mutex.${key}`, () => ({
    tail: Promise.resolve() as Promise<unknown>,
  }));

  return <T>(work: () => Promise<T> | T): Promise<T> => {
    const run = state.tail.then(work, work);
    state.tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  };
}

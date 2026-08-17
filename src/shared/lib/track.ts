/**
 * Typed analytics event bus (MPS §8).
 *
 * The event contract is expressed as TypeScript types — the compile-time
 * guarantee every call site actually needs. Runtime Zod validation is a
 * development-only safety net loaded through a dynamic import, so the
 * validation runtime never reaches a user's bundle (see track.schemas.ts,
 * which a test keeps structurally in sync with these types).
 */
export interface EventMap {
  page_viewed: { path: string };
  cta_clicked: { id: string; context?: string };
  booking_step_reached: {
    step: "where" | "table" | "time" | "payment" | "confirmed";
    clubId?: string;
  };
  recommendation_swap_accepted: { fromTableId: string; toTableId: string };
}

export type EventName = keyof EventMap;
export type EventPayload<N extends EventName> = EventMap[N];

export type Sink = (name: EventName, payload: Record<string, unknown>) => void;

const sinks = new Set<Sink>();

export function registerSink(sink: Sink): () => void {
  sinks.add(sink);
  return () => sinks.delete(sink);
}

/** Throws in development on a malformed payload; no-ops in production. */
function validateInDev<N extends EventName>(
  name: N,
  payload: EventPayload<N>,
): void {
  if (process.env.NODE_ENV === "production") return;
  void import("./track.schemas").then(({ eventSchemas }) => {
    const result = eventSchemas[name].safeParse(payload);
    if (!result.success) {
      throw new Error(
        `Invalid analytics payload for "${name}": ${result.error.message}`,
      );
    }
  });
}

export function track<N extends EventName>(
  name: N,
  payload: EventPayload<N>,
): void {
  validateInDev(name, payload);
  for (const sink of sinks) {
    try {
      sink(name, payload);
    } catch {
      // A failing sink must never break the product.
    }
  }
}

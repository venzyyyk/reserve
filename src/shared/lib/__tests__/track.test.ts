import { registerSink, track } from "../track";
import { eventSchemas } from "../track.schemas";

describe("track", () => {
  it("delivers valid events to registered sinks", () => {
    const received: unknown[] = [];
    const unregister = registerSink((name, payload) =>
      received.push([name, payload]),
    );
    track("cta_clicked", { id: "hero-book" });
    unregister();
    expect(received).toEqual([["cta_clicked", { id: "hero-book" }]]);
  });

  it("isolates failing sinks", () => {
    const unregisterBad = registerSink(() => {
      throw new Error("boom");
    });
    const received: unknown[] = [];
    const unregisterGood = registerSink((name) => received.push(name));
    expect(() => track("page_viewed", { path: "/" })).not.toThrow();
    expect(received).toEqual(["page_viewed"]);
    unregisterBad();
    unregisterGood();
  });
});

describe("event schemas (dev-only guard)", () => {
  it("covers every event in the type map", () => {
    expect(Object.keys(eventSchemas).sort()).toEqual([
      "booking_step_reached",
      "cta_clicked",
      "page_viewed",
      "recommendation_swap_accepted",
    ]);
  });

  it("rejects malformed payloads", () => {
    expect(
      eventSchemas.booking_step_reached.safeParse({ step: "nope" }).success,
    ).toBe(false);
    expect(eventSchemas.cta_clicked.safeParse({ id: "hero" }).success).toBe(
      true,
    );
  });
});

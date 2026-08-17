import { describe, expect, it } from "vitest";
import { processMap, processMutex, processStore } from "../process-store";

/**
 * These guard a bug that only ever appeared in `next dev`: module-level
 * state was re-created when a route was recompiled, so a saved decision
 * reverted and a booking made through the API was missing on the ticket
 * page. Simulating a second module evaluation is just calling the same
 * factory twice.
 */
describe("processStore", () => {
  it("returns the same instance on a second evaluation", () => {
    const first = processStore("test.instance", () => ({ n: 1 }));
    first.n = 42;
    const second = processStore("test.instance", () => ({ n: 1 }));
    expect(second).toBe(first);
    expect(second.n).toBe(42);
  });

  it("does not re-run the seed, so writes are not overwritten", () => {
    const seed = () => [["a", "seeded"] as const];

    const first = processMap<string>("test.seeded", seed);
    first.set("a", "edited");
    first.set("b", "added");

    const second = processMap<string>("test.seeded", seed);
    expect(second.get("a")).toBe("edited");
    expect(second.get("b")).toBe("added");
  });

  it("keeps different keys apart", () => {
    processMap<string>("test.one").set("k", "1");
    expect(processMap<string>("test.two").get("k")).toBeUndefined();
  });

  it("shares one lock across evaluations, so writes stay serialised", async () => {
    const order: number[] = [];
    const slow = async (n: number) => {
      await new Promise((resolve) => setTimeout(resolve, n === 1 ? 15 : 0));
      order.push(n);
    };

    // Two "modules", each with its own handle on the same named mutex.
    const lockA = processMutex("test.lock");
    const lockB = processMutex("test.lock");

    await Promise.all([lockA(() => slow(1)), lockB(() => slow(2))]);
    expect(order).toEqual([1, 2]);
  });

  it("keeps the queue alive after a rejected task", async () => {
    const lock = processMutex("test.lock.errors");
    await expect(lock(() => Promise.reject(new Error("boom")))).rejects.toThrow(
      "boom",
    );
    await expect(lock(() => "still working")).resolves.toBe("still working");
  });
});

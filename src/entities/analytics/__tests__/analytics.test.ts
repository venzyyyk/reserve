import { beforeEach, describe, expect, it } from "vitest";
import { conversionRate, readSource, sinceIso } from "../model";
import { memoryAnalyticsRepository as analytics } from "../repository.memory";

/**
 * The counter has one job it must never get wrong: count each thing once,
 * and only count what happened. Everything a club is later asked to pay for
 * rests on these numbers being honest.
 */
const at = (hoursAgo: number): string =>
  new Date(Date.now() - hoursAgo * 3_600_000).toISOString();

const since = () => sinceIso(30);

describe("conversionRate", () => {
  it("says nothing rather than zero when there is no data", () => {
    // "0%" reads as a bad club. "—" reads as a new one.
    expect(conversionRate({ viewed: 0, paid: 0 })).toBeNull();
  });

  it("reports one decimal", () => {
    expect(conversionRate({ viewed: 300, paid: 7 })).toBe(2.3);
    expect(conversionRate({ viewed: 4, paid: 1 })).toBe(25);
  });
});

describe("readSource", () => {
  it("combines source and medium when both are present", () => {
    const params = new URLSearchParams("utm_source=instagram&utm_medium=story");
    expect(readSource(params)).toBe("instagram / story");
  });

  it("falls back to the source alone, and to nothing at all", () => {
    expect(readSource(new URLSearchParams("utm_source=telegram"))).toBe(
      "telegram",
    );
    expect(readSource(new URLSearchParams("?x=1"))).toBeUndefined();
    expect(readSource(new URLSearchParams("utm_source=%20"))).toBeUndefined();
  });
});

describe("recording", () => {
  beforeEach(async () => {
    await analytics._reset();
  });

  it("counts a deduplicated event once, however many times it arrives", async () => {
    for (let poll = 0; poll < 5; poll += 1) {
      await analytics.record({
        name: "booking_paid",
        at: at(1),
        clubId: "c1",
        amount: 50_000,
        dedupeKey: "booking_paid:bk_1",
      });
    }

    const [funnel] = await analytics.funnels(since());
    expect(funnel?.paid).toBe(1);
    expect(funnel?.revenue).toBe(50_000);
  });

  it("counts undeduplicated events every time — views are not unique", async () => {
    for (let visit = 0; visit < 3; visit += 1) {
      await analytics.record({ name: "club_viewed", at: at(1), clubId: "c1" });
    }
    const [funnel] = await analytics.funnels(since());
    expect(funnel?.viewed).toBe(3);
  });

  it("ignores events older than the window", async () => {
    await analytics.record({
      name: "club_viewed",
      at: at(24 * 40),
      clubId: "c1",
    });
    await analytics.record({ name: "club_viewed", at: at(2), clubId: "c1" });

    const [funnel] = await analytics.funnels(since());
    expect(funnel?.viewed).toBe(1);
  });

  it("builds the whole funnel per club, busiest first", async () => {
    await analytics.record({ name: "club_viewed", at: at(1), clubId: "quiet" });
    for (let i = 0; i < 4; i += 1) {
      await analytics.record({
        name: "club_viewed",
        at: at(1),
        clubId: "busy",
      });
    }
    await analytics.record({
      name: "booking_started",
      at: at(1),
      clubId: "busy",
    });
    await analytics.record({
      name: "booking_paid",
      at: at(1),
      clubId: "busy",
      amount: 70_000,
      dedupeKey: "booking_paid:bk_2",
    });

    const funnels = await analytics.funnels(since());
    expect(funnels.map((funnel) => funnel.clubId)).toEqual(["busy", "quiet"]);
    expect(funnels[0]).toMatchObject({
      viewed: 4,
      started: 1,
      paid: 1,
      revenue: 70_000,
    });
  });

  it("ranks the searches that found nothing by how often they were asked", async () => {
    for (let i = 0; i < 3; i += 1) {
      await analytics.record({
        name: "search_empty",
        at: at(i + 1),
        detail: "місто: lviv",
      });
    }
    await analytics.record({
      name: "search_empty",
      at: at(1),
      detail: "місто: odesa",
    });

    const demand = await analytics.emptySearches(since(), 10);
    expect(demand[0]).toMatchObject({ detail: "місто: lviv", count: 3 });
    expect(demand[1]?.count).toBe(1);
  });

  it("groups traffic by source", async () => {
    await analytics.record({
      name: "club_viewed",
      at: at(1),
      clubId: "c1",
      source: "instagram / story",
    });
    await analytics.record({
      name: "booking_paid",
      at: at(1),
      clubId: "c1",
      source: "instagram / story",
      dedupeKey: "booking_paid:bk_3",
    });
    await analytics.record({
      name: "club_viewed",
      at: at(1),
      clubId: "c1",
      source: "telegram",
    });

    const sources = await analytics.sources(since());
    expect(sources[0]).toEqual({ source: "instagram / story", count: 2 });
    expect(sources[1]).toEqual({ source: "telegram", count: 1 });
  });

  it("returns one club's views grouped by day", async () => {
    await analytics.record({ name: "club_viewed", at: at(1), clubId: "c1" });
    await analytics.record({ name: "club_viewed", at: at(2), clubId: "c1" });
    await analytics.record({ name: "club_viewed", at: at(1), clubId: "c2" });

    const days = await analytics.dailyViews("c1", since());
    expect(days.reduce((sum, day) => sum + day.count, 0)).toBe(2);
    expect(await analytics.dailyViews("c3", since())).toEqual([]);
  });
});

import type { Club } from "../model";
import { openStatus, priceFrom, totalTables } from "../lib";

const base: Club = {
  id: "clb_test",
  slug: "test",
  city: "kyiv",
  name: "Тест",
  story: "Тестовий клуб.",
  about: [],
  address: { street: "вул. Тестова, 1", district: "Центр" },
  phone: "+380440000000",
  hours: {
    mon: { open: "12:00", close: "02:00" },
    tue: { open: "12:00", close: "02:00" },
    wed: { open: "12:00", close: "02:00" },
    thu: { open: "12:00", close: "02:00" },
    fri: { open: "12:00", close: "04:00" },
    sat: null,
    sun: { open: "14:00", close: "23:00" },
  },
  tables: [
    { type: "russian", count: 8, pricePerHourFrom: 25000 },
    { type: "pool", count: 4, pricePerHourFrom: 18000 },
  ],
  amenities: ["bar"],
  featured: false,
  published: true,
  onlineBooking: true,
  accentHue: 145,
};

/** Kyiv is UTC+3 in July — build UTC instants for wall-clock times. */
const kyiv = (iso: string) => new Date(`${iso}+03:00`);

describe("openStatus (Europe/Kyiv, cross-midnight)", () => {
  it("open during regular evening hours", () => {
    expect(openStatus(base, kyiv("2026-07-29T20:00:00"))).toEqual({
      state: "open",
      closesAt: "02:00",
    });
  });

  it("open past midnight on the previous day's schedule", () => {
    // 01:00 Thursday night = Wednesday's 12:00–02:00 window
    expect(openStatus(base, kyiv("2026-07-30T01:00:00"))).toMatchObject({
      state: "closing_soon",
      closesAt: "02:00",
    });
  });

  it("closed after the cross-midnight window ends", () => {
    expect(openStatus(base, kyiv("2026-07-30T03:00:00"))).toMatchObject({
      state: "closed",
    });
  });

  it("closing_soon within 60 minutes of close", () => {
    // Sunday closes 23:00 (no cross-midnight)
    expect(openStatus(base, kyiv("2026-08-02T22:15:00"))).toEqual({
      state: "closing_soon",
      closesAt: "23:00",
    });
  });

  it("closed on a null day, even inside typical hours", () => {
    // Saturday is null; 20:00 Saturday must not match Friday's window (04:00 close passed)
    expect(openStatus(base, kyiv("2026-08-01T20:00:00"))).toMatchObject({
      state: "closed",
      opensAt: null,
    });
  });

  it("reports today's opening time before open", () => {
    expect(openStatus(base, kyiv("2026-07-29T10:00:00"))).toMatchObject({
      state: "closed",
      opensAt: "12:00",
    });
  });
});

describe("pricing and inventory", () => {
  it("priceFrom is the cheapest group", () => {
    expect(priceFrom(base).amount).toBe(18000);
  });

  it("totalTables sums groups", () => {
    expect(totalTables(base)).toBe(12);
  });
});

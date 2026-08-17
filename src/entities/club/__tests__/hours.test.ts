import type { Club } from "../model";
import {
  directionsUrl,
  groupedHours,
  isEveryDaySameHours,
  todayInKyiv,
} from "../lib";

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
    sat: { open: "14:00", close: "04:00" },
    sun: null,
  },
  tables: [{ type: "russian", count: 8, pricePerHourFrom: 25000 }],
  amenities: ["bar"],
  featured: false,
  published: true,
  onlineBooking: true,
  accentHue: 145,
};

describe("groupedHours", () => {
  it("collapses identical consecutive days into one range", () => {
    const groups = groupedHours(base);
    expect(groups[0]).toEqual({
      days: ["mon", "tue", "wed", "thu"],
      open: "12:00",
      close: "02:00",
    });
  });

  it("starts a new group when hours differ", () => {
    const groups = groupedHours(base);
    expect(groups.map((g) => g.days)).toEqual([
      ["mon", "tue", "wed", "thu"],
      ["fri"],
      ["sat"],
    ]);
  });

  it("omits closed days entirely (the page lists them separately)", () => {
    expect(groupedHours(base).flatMap((g) => g.days)).not.toContain("sun");
  });

  it("does not merge days separated by a closed day", () => {
    const split: Club = {
      ...base,
      hours: {
        ...base.hours,
        mon: { open: "10:00", close: "20:00" },
        tue: null,
        wed: { open: "10:00", close: "20:00" },
        thu: null,
        fri: null,
        sat: null,
      },
    };
    expect(groupedHours(split).map((g) => g.days)).toEqual([["mon"], ["wed"]]);
  });
});

describe("isEveryDaySameHours", () => {
  it("is true only when all seven days match", () => {
    expect(isEveryDaySameHours(base)).toBe(false);

    const allWeek = { open: "10:00", close: "06:00" };
    const alwaysOpen: Club = {
      ...base,
      hours: {
        mon: allWeek,
        tue: allWeek,
        wed: allWeek,
        thu: allWeek,
        fri: allWeek,
        sat: allWeek,
        sun: allWeek,
      },
    };
    expect(isEveryDaySameHours(alwaysOpen)).toBe(true);
  });
});

describe("todayInKyiv", () => {
  it("returns the Kyiv weekday, not the runtime's", () => {
    // 00:30 UTC Thursday is already 03:30 Thursday in Kyiv.
    expect(todayInKyiv(new Date("2026-07-30T00:30:00Z"))).toBe("thu");
    // 22:30 UTC Wednesday is 01:30 Thursday in Kyiv.
    expect(todayInKyiv(new Date("2026-07-29T22:30:00Z"))).toBe("thu");
  });
});

describe("directionsUrl", () => {
  it("uses coordinates when the club has them", () => {
    const withCoords: Club = {
      ...base,
      address: { ...base.address, coords: { lat: 50.4392, lng: 30.5178 } },
    };
    expect(directionsUrl(withCoords)).toContain(
      "destination=50.4392%2C30.5178",
    );
  });

  it("falls back to a name and street query", () => {
    const url = directionsUrl(base);
    expect(url).toContain(encodeURIComponent("Тест"));
    expect(url).toContain(encodeURIComponent("вул. Тестова, 1"));
  });
});

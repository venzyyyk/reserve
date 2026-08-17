import type { Club } from "@/entities/club";
import {
  availableStarts,
  clubTables,
  formatMinutes,
  isRangeFree,
  nextFreeStart,
  openWindow,
  priceFor,
  slotStarts,
  weekDayOf,
} from "../lib";
import type { Occupancy } from "../model";

const club: Club = {
  id: "clb_test",
  slug: "test",
  city: "kyiv",
  name: "Тест",
  story: "—",
  about: [],
  address: { street: "вул. Тестова, 1", district: "Центр" },
  phone: "+380440000000",
  hours: {
    mon: { open: "12:00", close: "02:00" },
    tue: { open: "12:00", close: "02:00" },
    wed: { open: "12:00", close: "02:00" },
    thu: { open: "12:00", close: "02:00" },
    fri: { open: "12:00", close: "04:00" },
    sat: { open: "14:00", close: "23:00" },
    sun: null,
  },
  tables: [
    { type: "russian", count: 2, pricePerHourFrom: 25000 },
    { type: "pool", count: 1, pricePerHourFrom: 18000 },
  ],
  amenities: ["bar"],
  featured: false,
  published: true,
  onlineBooking: true,
  accentHue: 145,
};

// 2026-08-01 is a Saturday; 2026-08-03 a Monday; 2026-08-02 a Sunday.
const SATURDAY = "2026-08-01";
const SUNDAY = "2026-08-02";
const MONDAY = "2026-08-03";

describe("weekDayOf", () => {
  it("maps ISO dates to Monday-first weekdays", () => {
    expect(weekDayOf(SATURDAY)).toBe("sat");
    expect(weekDayOf(SUNDAY)).toBe("sun");
    expect(weekDayOf(MONDAY)).toBe("mon");
  });
});

describe("clubTables", () => {
  it("expands groups into individually numbered tables", () => {
    const tables = clubTables(club);
    expect(tables.map((t) => t.id)).toEqual([
      "russian-1",
      "russian-2",
      "pool-3",
    ]);
    expect(tables.map((t) => t.number)).toEqual([1, 2, 3]);
  });

  it("carries the group's price and details onto each table", () => {
    const [first, , pool] = clubTables(club);
    expect(first?.pricePerHour).toBe(25000);
    expect(pool?.type).toBe("pool");
    expect(pool?.pricePerHour).toBe(18000);
  });
});

describe("openWindow", () => {
  it("expresses a cross-midnight close as minutes past 1440", () => {
    expect(openWindow(club, MONDAY)).toEqual({ start: 720, end: 1560 });
  });

  it("leaves same-day closes untouched", () => {
    expect(openWindow(club, SATURDAY)).toEqual({ start: 840, end: 1380 });
  });

  it("returns null on a closed day", () => {
    expect(openWindow(club, SUNDAY)).toBeNull();
  });
});

describe("slotStarts", () => {
  it("offers half-hour starts that fit inside the window", () => {
    const starts = slotStarts(club, SATURDAY);
    expect(starts[0]).toBe(840); // 14:00
    expect(starts.at(-1)).toBe(1350); // 22:30, the last sellable half hour
  });

  it("is empty on a closed day", () => {
    expect(slotStarts(club, SUNDAY)).toEqual([]);
  });
});

describe("isRangeFree", () => {
  const occupied: Occupancy[] = [
    { tableId: "russian-1", date: MONDAY, start: 1200, end: 1320 },
  ];

  it("rejects a range that overlaps an existing booking", () => {
    expect(
      isRangeFree(
        club,
        MONDAY,
        "russian-1",
        { start: 1260, end: 1380 },
        occupied,
      ),
    ).toBe(false);
  });

  it("allows a range that starts exactly when another ends", () => {
    expect(
      isRangeFree(
        club,
        MONDAY,
        "russian-1",
        { start: 1320, end: 1380 },
        occupied,
      ),
    ).toBe(true);
  });

  it("ignores occupancy on other tables and other dates", () => {
    expect(
      isRangeFree(
        club,
        MONDAY,
        "russian-2",
        { start: 1260, end: 1320 },
        occupied,
      ),
    ).toBe(true);
    expect(
      isRangeFree(
        club,
        SATURDAY,
        "russian-1",
        { start: 1260, end: 1320 },
        occupied,
      ),
    ).toBe(true);
  });

  it("rejects a range running past closing time", () => {
    expect(
      isRangeFree(club, SATURDAY, "russian-1", { start: 1320, end: 1440 }, []),
    ).toBe(false);
  });

  it("allows a range inside the cross-midnight window", () => {
    expect(
      isRangeFree(club, MONDAY, "russian-1", { start: 1440, end: 1560 }, []),
    ).toBe(true);
  });
});

describe("availableStarts / nextFreeStart", () => {
  const occupied: Occupancy[] = [
    { tableId: "russian-1", date: SATURDAY, start: 840, end: 1080 },
  ];

  it("excludes starts blocked by a booking", () => {
    const starts = availableStarts(club, SATURDAY, "russian-1", 60, occupied);
    expect(starts).not.toContain(840);
    expect(starts).toContain(1080);
  });

  it("reports when the table frees up", () => {
    expect(nextFreeStart(club, SATURDAY, "russian-1", 60, occupied)).toBe(1080);
  });

  it("returns null when nothing fits after the cutoff", () => {
    expect(
      nextFreeStart(club, SATURDAY, "russian-1", 60, occupied, 1350),
    ).toBeNull();
  });
});

describe("priceFor", () => {
  const [table] = clubTables(club);

  it("charges the hourly rate for a full hour", () => {
    expect(priceFor(table!, 60).amount).toBe(25000);
  });

  it("charges per half hour, not per started hour", () => {
    expect(priceFor(table!, 90).amount).toBe(37500);
  });

  it("scales linearly for longer sessions", () => {
    expect(priceFor(table!, 180).amount).toBe(75000);
  });
});

describe("formatMinutes", () => {
  it("formats within the day", () => {
    expect(formatMinutes(840)).toBe("14:00");
    expect(formatMinutes(1350)).toBe("22:30");
  });

  it("wraps past midnight", () => {
    expect(formatMinutes(1440)).toBe("00:00");
    expect(formatMinutes(1560)).toBe("02:00");
  });
});

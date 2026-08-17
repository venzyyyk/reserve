import type { Club } from "@/entities/club";
import { DEFAULT_QUERY, filterClubs } from "../lib/filter";

function club(overrides: Partial<Club> & Pick<Club, "id">): Club {
  return {
    slug: overrides.id,
    city: "kyiv",
    name: overrides.id,
    story: "—",
    about: [],
    address: { street: "вул. Тестова, 1", district: "Центр" },
    phone: "+380440000000",
    hours: {
      mon: null,
      tue: null,
      wed: null,
      thu: null,
      fri: null,
      sat: null,
      sun: null,
    },
    tables: [{ type: "pool", count: 4, pricePerHourFrom: 20000 }],
    amenities: [],
    featured: false,
    accentHue: 145,
    ...overrides,
    // After the spread: a fixture may override these, but they must end up
    // defined, and `Partial<Club>` alone would leave them optional.
    published: overrides.published ?? true,
    onlineBooking: overrides.onlineBooking ?? true,
  };
}

const cheap = club({
  id: "cheap",
  tables: [{ type: "pool", count: 2, pricePerHourFrom: 10000 }],
});
const big = club({
  id: "big",
  tables: [{ type: "russian", count: 10, pricePerHourFrom: 30000 }],
  amenities: ["bar", "parking"],
});
const featured = club({ id: "featured", featured: true, amenities: ["bar"] });
const lviv = club({ id: "lviv", city: "lviv" });

const all = [cheap, big, featured, lviv];

describe("filterClubs", () => {
  it("returns everything by default", () => {
    expect(filterClubs(all, DEFAULT_QUERY)).toHaveLength(4);
  });

  it("filters by city", () => {
    const result = filterClubs(all, { ...DEFAULT_QUERY, city: "lviv" });
    expect(result.map((c) => c.id)).toEqual(["lviv"]);
  });

  it("matches a club if ANY table group matches the type filter", () => {
    const result = filterClubs(all, { ...DEFAULT_QUERY, types: ["russian"] });
    expect(result.map((c) => c.id)).toEqual(["big"]);
  });

  it("requires ALL selected amenities (AND semantics)", () => {
    expect(
      filterClubs(all, { ...DEFAULT_QUERY, amenities: ["bar", "parking"] }).map(
        (c) => c.id,
      ),
    ).toEqual(["big"]);
    expect(
      filterClubs(all, { ...DEFAULT_QUERY, amenities: ["bar"] }),
    ).toHaveLength(2);
  });

  it("applies the price ceiling to the cheapest table", () => {
    const result = filterClubs(all, { ...DEFAULT_QUERY, maxPrice: 20000 });
    expect(result.map((c) => c.id).sort()).toEqual([
      "cheap",
      "featured",
      "lviv",
    ]);
  });

  it("sorts by price ascending", () => {
    const result = filterClubs(all, { ...DEFAULT_QUERY, sort: "price_asc" });
    expect(result[0]?.id).toBe("cheap");
  });

  it("sorts recommended: featured first, then inventory", () => {
    const result = filterClubs(all, { ...DEFAULT_QUERY, sort: "recommended" });
    expect(result[0]?.id).toBe("featured");
    expect(result[1]?.id).toBe("big");
  });

  it("does not mutate the input array", () => {
    const input = [...all];
    filterClubs(input, { ...DEFAULT_QUERY, sort: "price_asc" });
    expect(input.map((c) => c.id)).toEqual(all.map((c) => c.id));
  });
});

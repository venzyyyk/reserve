import { screen } from "@testing-library/react";
import type { Club } from "@/entities/club";
import { renderWithIntl } from "@/shared/lib/test-utils";
import { ClubCard } from "../club-card";

const club: Club = {
  id: "clb_test",
  slug: "klasyk",
  city: "kyiv",
  name: "Класик",
  story: "—",
  about: [],
  address: {
    street: "вул. Саксаганського, 12",
    district: "Печерськ",
    metro: { name: "Палац Спорту", walkMinutes: 6 },
  },
  phone: "+380442001234",
  hours: {
    mon: { open: "12:00", close: "02:00" },
    tue: { open: "12:00", close: "02:00" },
    wed: { open: "12:00", close: "02:00" },
    thu: { open: "12:00", close: "02:00" },
    fri: { open: "12:00", close: "04:00" },
    sat: { open: "14:00", close: "04:00" },
    sun: { open: "14:00", close: "00:00" },
  },
  tables: [
    { type: "russian", count: 8, pricePerHourFrom: 25000 },
    { type: "pool", count: 4, pricePerHourFrom: 20000 },
  ],
  amenities: ["bar"],
  featured: true,
  published: true,
  onlineBooking: true,
  accentHue: 145,
};

describe("ClubCard", () => {
  it("links to the club page with an accessible name", () => {
    renderWithIntl(<ClubCard club={club} />);
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/clubs/kyiv/klasyk");
    expect(link).toHaveAccessibleName(/Класик/);
  });

  it("shows the cheapest hourly price, not the first group's", () => {
    renderWithIntl(<ClubCard club={club} />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
    expect(screen.queryByText(/250/)).not.toBeInTheDocument();
  });

  it("summarises inventory and metro proximity", () => {
    renderWithIntl(<ClubCard club={club} />);
    expect(screen.getByText(/12 столів/)).toBeInTheDocument();
    expect(screen.getByText(/Палац Спорту/)).toBeInTheDocument();
  });

  it("renders a single heading per card (grid stays navigable)", () => {
    renderWithIntl(<ClubCard club={club} />);
    expect(screen.getAllByRole("heading")).toHaveLength(1);
  });

  it("falls back to the district alone when a club has no metro", () => {
    const noMetro: Club = {
      ...club,
      address: { street: "вул. Тестова, 1", district: "Приморський" },
    };
    renderWithIntl(<ClubCard club={noMetro} />);
    expect(screen.getByText("Приморський")).toBeInTheDocument();
  });
});

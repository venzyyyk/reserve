import { screen } from "@testing-library/react";
import type { Club } from "@/entities/club";
import { flags } from "@/shared/config/flags";
import { renderWithIntl } from "@/shared/lib/test-utils";
import { BookingPanel } from "../booking-panel";

const club: Club = {
  id: "clb_test",
  slug: "klasyk",
  city: "kyiv",
  name: "Класик",
  story: "—",
  about: [],
  address: { street: "вул. Саксаганського, 12", district: "Печерськ" },
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

/**
 * The panel's promise: whatever it offers must actually work. Since M2a it
 * leads into the booking flow; if `onlineBooking` is ever switched off
 * during an incident it falls back to a phone call and says so. Both
 * branches are asserted against the flag rather than hard-coded, so
 * flipping it cannot leave a dead button behind.
 */
describe("BookingPanel", () => {
  it("offers an action that works in the current configuration", () => {
    renderWithIntl(<BookingPanel club={club} />);

    if (flags.onlineBooking) {
      expect(screen.getByRole("link", { name: /Забронювати/ })).toHaveAttribute(
        "href",
        "/clubs/kyiv/klasyk/book",
      );
    } else {
      expect(screen.getByRole("link", { name: /Подзвонити/ })).toHaveAttribute(
        "href",
        "tel:+380442001234",
      );
      expect(screen.getByText(/Онлайн-бронювання/)).toBeInTheDocument();
    }
  });

  it("never shows a booking link while online booking is off", () => {
    renderWithIntl(<BookingPanel club={club} />);
    if (!flags.onlineBooking) {
      expect(screen.queryByRole("link", { name: /Забронювати/ })).toBeNull();
    }
  });

  it("leads with the cheapest hourly price", () => {
    renderWithIntl(<BookingPanel club={club} />);
    expect(screen.getByText(/200/)).toBeInTheDocument();
  });
});

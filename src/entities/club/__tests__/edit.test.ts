import { describe, expect, it } from "vitest";
import {
  applyEdit,
  clubEditSchema,
  slugify,
  toEdit,
  type ClubEdit,
} from "../edit";
import { isBookable, isVisible } from "../model";

/**
 * The club form is how every club after the first five gets onto the
 * platform, so what it produces has to be exactly what a hand-written
 * content file produced. These check the round trip and the two flags that
 * decide what a guest sees.
 */
const valid: ClubEdit = {
  name: "Дуплет",
  city: "kharkiv",
  story: "Сім столів і тиша",
  street: "вул. Сумська, 10",
  district: "Центр",
  phone: "+380501234567",
  published: true,
  onlineBooking: false,
  featured: false,
  accentHue: 145,
  hours: {
    mon: "12:00-23:00",
    tue: "12:00-23:00",
    wed: "",
    thu: "12:00-23:00",
    fri: "12:00-02:00",
    sat: "12:00-02:00",
    sun: "",
  },
  tables: [{ type: "russian", count: 7, priceUah: 250 }],
  amenities: ["bar"],
};

describe("slugify", () => {
  it("transliterates Ukrainian so a link reads like the place", () => {
    expect(slugify("Кий і Куля")).toBe("kyi-i-kulia");
    expect(slugify("Абріколь")).toBe("abrikol");
  });

  it("never produces an empty slug", () => {
    expect(slugify("!!!")).toBe("club");
    expect(slugify("")).toBe("club");
  });
});

describe("applyEdit", () => {
  it("stores hryvnia as kopiykas", () => {
    const club = applyEdit(valid);
    expect(club.tables[0]?.pricePerHourFrom).toBe(25_000);
  });

  it("reads an empty day as closed", () => {
    const club = applyEdit(valid);
    expect(club.hours.wed).toBeNull();
    expect(club.hours.mon).toEqual({ open: "12:00", close: "23:00" });
    // Past midnight is normal for a billiard club and must survive.
    expect(club.hours.fri).toEqual({ open: "12:00", close: "02:00" });
  });

  it("keeps the slug when a club is renamed, because links are forever", () => {
    const original = applyEdit(valid);
    const renamed = applyEdit({ ...valid, name: "Дуплет Преміум" }, original);

    expect(renamed.slug).toBe(original.slug);
    expect(renamed.id).toBe(original.id);
    expect(renamed.name).toBe("Дуплет Преміум");
  });

  it("preserves fields the form cannot edit", () => {
    const original = applyEdit(valid);
    const withAbout = { ...original, about: ["Довгий текст про клуб."] };
    const edited = applyEdit({ ...valid, story: "Інший рядок" }, withAbout);

    expect(edited.about).toEqual(["Довгий текст про клуб."]);
  });

  it("round-trips through the form without drift", () => {
    const club = applyEdit(valid);
    const again = applyEdit(toEdit(club), club);
    expect(again).toStrictEqual(club);
  });
});

describe("validation", () => {
  it("rejects a phone that is not Ukrainian", () => {
    expect(
      clubEditSchema.safeParse({ ...valid, phone: "0501234567" }).success,
    ).toBe(false);
  });

  it("rejects nonsense opening hours", () => {
    const broken = { ...valid, hours: { ...valid.hours, mon: "з 12 до 23" } };
    expect(clubEditSchema.safeParse(broken).success).toBe(false);
  });

  it("tolerates spaces around a time range", () => {
    const spaced = {
      ...valid,
      hours: { ...valid.hours, mon: " 12:00 - 23:00 " },
    };
    const parsed = clubEditSchema.safeParse(spaced);
    expect(parsed.success).toBe(true);
  });

  it("refuses a club with no tables at all", () => {
    expect(clubEditSchema.safeParse({ ...valid, tables: [] }).success).toBe(
      false,
    );
  });
});

describe("visibility", () => {
  it("hides a draft from the public entirely", () => {
    const draft = applyEdit({ ...valid, published: false });
    expect(isVisible(draft)).toBe(false);
    expect(isBookable(draft)).toBe(false);
  });

  it("lists a free-tier club but does not offer checkout", () => {
    const listed = applyEdit({
      ...valid,
      published: true,
      onlineBooking: false,
    });
    expect(isVisible(listed)).toBe(true);
    // The guest gets a phone number, not a button that goes nowhere.
    expect(isBookable(listed)).toBe(false);
  });

  it("offers checkout only when both are true", () => {
    const bookable = applyEdit({
      ...valid,
      published: true,
      onlineBooking: true,
    });
    expect(isBookable(bookable)).toBe(true);
  });
});

import { z } from "zod";
import { clubSchema, hoursSchema } from "./schema";
import type { Club } from "./model";

/**
 * What an operator can type into the club form.
 *
 * Deliberately narrower than `Club`. Photos, floor plans and coordinates
 * are not here: onboarding a club for the free listing tier is a phone call
 * and five minutes of typing, and a form that demands a floor plan before
 * it will save anything is a form that stops the conversation.
 *
 * The id and slug are structural. A slug that changed would break every
 * link ever shared to that club, so it is set once, at creation.
 */
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** "12:00-02:00", or empty for a day the club is closed. */
const dayField = z
  .string()
  .trim()
  .transform((value) => value.replace(/\s/g, ""))
  .refine(
    (value) =>
      value === "" ||
      /^([01]\d|2[0-3]):[0-5]\d-([01]\d|2[0-3]):[0-5]\d$/.test(value),
    "Формат: 12:00-02:00, або порожньо, якщо зачинено",
  );

export const clubEditSchema = z.object({
  name: z.string().trim().min(2).max(60),
  city: z.string().trim().min(2),
  story: z.string().trim().min(1).max(140),
  street: z.string().trim().min(3).max(120),
  district: z.string().trim().min(2).max(60),
  phone: z
    .string()
    .trim()
    .regex(/^\+380\d{9}$/, "Формат: +380XXXXXXXXX"),
  published: z.boolean(),
  onlineBooking: z.boolean(),
  featured: z.boolean(),
  accentHue: z.coerce.number().min(0).max(360),
  hours: z.object({
    mon: dayField,
    tue: dayField,
    wed: dayField,
    thu: dayField,
    fri: dayField,
    sat: dayField,
    sun: dayField,
  }),
  /** At least one table group, or the club cannot be priced or booked. */
  tables: z
    .array(
      z.object({
        type: z.enum(["russian", "pool", "snooker"]),
        count: z.coerce.number().int().min(1).max(60),
        /** Hryvnia in the form, kopiykas in the domain. */
        priceUah: z.coerce.number().min(1).max(100_000),
      }),
    )
    .min(1, "Додайте хоча б один тип столів"),
  amenities: z.array(z.string()),
});

export type ClubEdit = z.infer<typeof clubEditSchema>;

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

/** "12:00-02:00" → { open, close }; empty → closed. */
function parseDay(value: string): { open: string; close: string } | null {
  if (value === "") return null;
  const [open, close] = value.split("-");
  return open && close ? { open, close } : null;
}

function formatDay(day: { open: string; close: string } | null): string {
  return day ? `${day.open}-${day.close}` : "";
}

/** Slug from the club's name, so a link reads like the place it points at. */
export function slugify(name: string): string {
  const map: Record<string, string> = {
    а: "a",
    б: "b",
    в: "v",
    г: "h",
    ґ: "g",
    д: "d",
    е: "e",
    є: "ie",
    ж: "zh",
    з: "z",
    и: "y",
    і: "i",
    ї: "i",
    й: "i",
    к: "k",
    л: "l",
    м: "m",
    н: "n",
    о: "o",
    п: "p",
    р: "r",
    с: "s",
    т: "t",
    у: "u",
    ф: "f",
    х: "kh",
    ц: "ts",
    ч: "ch",
    ш: "sh",
    щ: "shch",
    ь: "",
    ю: "iu",
    я: "ia",
    ы: "y",
    э: "e",
    ъ: "",
  };

  return (
    name
      .toLowerCase()
      .split("")
      .map((character) => map[character] ?? character)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "club"
  );
}

/** Form values → a validated club, preserving anything the form cannot edit. */
export function applyEdit(edit: ClubEdit, existing?: Club): Club {
  const hours = Object.fromEntries(
    DAYS.map((day) => [day, parseDay(edit.hours[day])]),
  );

  return clubSchema.parse({
    ...existing,
    id: existing?.id ?? `clb_${crypto.randomUUID().slice(0, 8)}`,
    slug: existing?.slug ?? slugify(edit.name),
    city: edit.city,
    name: edit.name,
    story: edit.story,
    about: existing?.about ?? [],
    address: {
      ...existing?.address,
      street: edit.street,
      district: edit.district,
    },
    phone: edit.phone,
    hours: hoursSchema.parse(hours),
    tables: edit.tables.map((table) => ({
      type: table.type,
      count: table.count,
      pricePerHourFrom: Math.round(table.priceUah * 100),
    })),
    amenities: edit.amenities,
    featured: edit.featured,
    published: edit.published,
    onlineBooking: edit.onlineBooking,
    accentHue: edit.accentHue,
  });
}

/** A club → the form values that would reproduce it. */
export function toEdit(club: Club): ClubEdit {
  return {
    name: club.name,
    city: club.city,
    story: club.story,
    street: club.address.street,
    district: club.address.district,
    phone: club.phone,
    published: club.published,
    onlineBooking: club.onlineBooking,
    featured: club.featured,
    accentHue: club.accentHue,
    hours: Object.fromEntries(
      DAYS.map((day) => [day, formatDay(club.hours[day])]),
    ) as ClubEdit["hours"],
    tables: club.tables.map((table) => ({
      type: table.type,
      count: table.count,
      priceUah: table.pricePerHourFrom / 100,
    })),
    amenities: [...club.amenities],
  };
}

export { DAYS, timeString };

import { z } from "zod";
import { TABLE_TYPES } from "./model";

/** "23:30" — minutes since midnight are derived in lib.ts. */
const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const dayHours = z.object({ open: timeString, close: timeString }).nullable();

/** Weekday keys in ISO order; null = closed that day. */
export const hoursSchema = z.object({
  mon: dayHours,
  tue: dayHours,
  wed: dayHours,
  thu: dayHours,
  fri: dayHours,
  sat: dayHours,
  sun: dayHours,
});

export const tableTypeSchema = z.enum(TABLE_TYPES);

export const tableGroupSchema = z.object({
  type: tableTypeSchema,
  count: z.number().int().positive(),
  sizeFt: z.number().optional(),
  brand: z.string().optional(),
  /** Integer kopiykas (Money contract, MPS §8). */
  pricePerHourFrom: z.number().int().positive(),
});

export const amenitySchema = z.enum([
  "bar",
  "kitchen",
  "parking",
  "wifi",
  "ac",
  "vip_rooms",
  "cue_rental",
  "accessible",
]);

export const clubSchema = z.object({
  id: z.string(),
  slug: z.string().regex(/^[a-z0-9-]+$/),
  city: z.string(),
  name: z.string().min(1),
  /** One-sentence identity line (MPS §6: story strip, ≤140 chars). */
  story: z.string().max(140),
  /** 1–3 short paragraphs for the club page. Absent = page omits the block. */
  about: z.array(z.string().min(1)).max(3).default([]),
  address: z.object({
    street: z.string(),
    district: z.string(),
    metro: z
      .object({ name: z.string(), walkMinutes: z.number().int() })
      .optional(),
    /** Drives the directions link; no embedded map until it earns its bytes. */
    coords: z.object({ lat: z.number(), lng: z.number() }).optional(),
    parking: z.string().optional(),
  }),
  phone: z.string().regex(/^\+380\d{9}$/),
  hours: hoursSchema,
  tables: z.array(tableGroupSchema).min(1),
  amenities: z.array(amenitySchema),
  /** Present only once verified reviews exist (M6). */
  rating: z
    .object({ value: z.number().min(1).max(5), count: z.number().int() })
    .optional(),
  featured: z.boolean().default(false),
  /**
   * A draft club exists in the admin panel and nowhere else. Onboarding a
   * club is a conversation, not a form submit — photos and hours arrive
   * over days — so a half-filled club must be able to wait somewhere that
   * is not the catalogue.
   */
  published: z.boolean().default(true),
  /**
   * Whether the table can be booked and paid for here.
   *
   * False is the free-listing tier: the club is in the catalogue with its
   * hours, prices and phone number, and the call to action says "book by
   * phone" instead of pretending to a checkout it does not have. A dead
   * booking button would cost the guest more than the listing gains us.
   */
  onlineBooking: z.boolean().default(true),
  /** Brand hue (0-360) driving the designed no-photo cover treatment. */
  accentHue: z.number().min(0).max(360),
});

export const clubsFileSchema = z.array(clubSchema);

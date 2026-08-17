import type { z } from "zod";
import type { amenitySchema, clubSchema } from "./schema";

/**
 * Table types as a plain tuple, not a Zod enum: this list is read by client
 * components (filters, search), and exporting the schema value would ship
 * the validation runtime to every page that renders a type chip (ADR-0006).
 * `schema.ts` derives its enum from this tuple, so they cannot diverge.
 */
export const TABLE_TYPES = ["russian", "pool", "snooker"] as const;
export type TableType = (typeof TABLE_TYPES)[number];

export type Club = z.infer<typeof clubSchema>;
export type Amenity = z.infer<typeof amenitySchema>;

export const TABLE_TYPE_LABELS: Record<TableType, string> = {
  russian: "Руський",
  pool: "Пул",
  snooker: "Снукер",
};

export const AMENITY_LABELS: Record<Amenity, string> = {
  bar: "Бар",
  kitchen: "Кухня",
  parking: "Парковка",
  wifi: "Wi-Fi",
  ac: "Кондиціонер",
  vip_rooms: "VIP-зали",
  cue_rental: "Оренда київ",
  accessible: "Безбар'єрний доступ",
};

export function clubHref(club: Pick<Club, "city" | "slug">): string {
  return `/clubs/${club.city}/${club.slug}`;
}

/** What the public may see: everything published, drafts nowhere. */
export function isVisible(club: Pick<Club, "published">): boolean {
  return club.published;
}

/** Whether the booking flow is available, as opposed to a phone number. */
export function isBookable(
  club: Pick<Club, "published" | "onlineBooking">,
): boolean {
  return club.published && club.onlineBooking;
}

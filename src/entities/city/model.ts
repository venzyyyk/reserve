/**
 * Cities are domain data, not translations: the product is uk-only and city
 * slugs are routing + SEO surface (MPS §2: /clubs/[city]).
 */
export interface City {
  slug: string;
  /** Nominative: "Київ" */
  name: string;
  /** Locative with preposition: "у Києві" — for headings and SEO titles. */
  locative: string;
}

export const CITIES: readonly City[] = [
  { slug: "kyiv", name: "Київ", locative: "у Києві" },
  { slug: "lviv", name: "Львів", locative: "у Львові" },
  { slug: "odesa", name: "Одеса", locative: "в Одесі" },
  { slug: "kharkiv", name: "Харків", locative: "у Харкові" },
  { slug: "dnipro", name: "Дніпро", locative: "у Дніпрі" },
] as const;

export function cityBySlug(slug: string): City | undefined {
  return CITIES.find((c) => c.slug === slug);
}

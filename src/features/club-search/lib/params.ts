import {
  createLoader,
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
} from "nuqs/server";

/**
 * Single source of truth for catalog URL state (MPS §8: URL state = nuqs).
 * The same parsers are used by the server loader and the client filter UI,
 * so a shareable URL and the rendered filters can never disagree.
 */
export const catalogParsers = {
  city: parseAsString,
  types: parseAsArrayOf(
    parseAsStringLiteral(["russian", "pool", "snooker"] as const),
  ).withDefault([]),
  amenities: parseAsArrayOf(
    parseAsStringLiteral([
      "bar",
      "kitchen",
      "parking",
      "wifi",
      "ac",
      "vip_rooms",
      "cue_rental",
      "accessible",
    ] as const),
  ).withDefault([]),
  maxPrice: parseAsInteger,
  sort: parseAsStringLiteral([
    "recommended",
    "price_asc",
    "tables_desc",
  ] as const).withDefault("recommended"),
};

export const loadCatalogParams = createLoader(catalogParsers);

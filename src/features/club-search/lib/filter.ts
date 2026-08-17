import {
  priceFrom,
  type Amenity,
  type Club,
  type TableType,
} from "@/entities/club";

/** Catalog query — mirrors the URL search params exactly (nuqs, MPS §8). */
export interface ClubQuery {
  city: string | null;
  types: readonly TableType[];
  amenities: readonly Amenity[];
  /** Max hourly price in kopiykas; null = no ceiling. */
  maxPrice: number | null;
  sort: ClubSort;
}

export type ClubSort = "recommended" | "price_asc" | "tables_desc";

export const DEFAULT_QUERY: ClubQuery = {
  city: null,
  types: [],
  amenities: [],
  maxPrice: null,
  sort: "recommended",
};

function matches(club: Club, query: ClubQuery): boolean {
  if (query.city && club.city !== query.city) return false;
  if (
    query.types.length > 0 &&
    !club.tables.some((t) => query.types.includes(t.type))
  ) {
    return false;
  }
  if (!query.amenities.every((a) => club.amenities.includes(a))) return false;
  if (query.maxPrice !== null && priceFrom(club).amount > query.maxPrice)
    return false;
  return true;
}

function tableCount(club: Club): number {
  return club.tables.reduce((sum, group) => sum + group.count, 0);
}

/**
 * Pure catalog filtering + sorting. Lives in the feature (not the entity) —
 * it encodes product ranking rules, not domain truth. Shared by the server
 * catalog render and any future client-side refinement.
 */
export function filterClubs(clubs: readonly Club[], query: ClubQuery): Club[] {
  const result = clubs.filter((club) => matches(club, query));
  switch (query.sort) {
    case "price_asc":
      return result.sort((a, b) => priceFrom(a).amount - priceFrom(b).amount);
    case "tables_desc":
      return result.sort((a, b) => tableCount(b) - tableCount(a));
    case "recommended":
      // Featured first, then more inventory — a stable, explainable default.
      return result.sort(
        (a, b) =>
          Number(b.featured) - Number(a.featured) ||
          tableCount(b) - tableCount(a),
      );
  }
}

"use client";

import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { CITIES } from "@/entities/city";
import {
  AMENITY_LABELS,
  TABLE_TYPES,
  TABLE_TYPE_LABELS,
} from "@/entities/club";
import type { Amenity } from "@/entities/club";
import { Chip } from "@/shared/ui/chip";
import { Select, type SelectOption } from "@/shared/ui/select";
import type { ClubSort } from "../lib/filter";
import { catalogParsers } from "../lib/params";

const SORT_VALUES: readonly ClubSort[] = [
  "recommended",
  "price_asc",
  "tables_desc",
];
const FILTERABLE_AMENITIES: readonly Amenity[] = [
  "bar",
  "kitchen",
  "parking",
  "vip_rooms",
];

function toSort(value: string): ClubSort {
  return SORT_VALUES.includes(value as ClubSort)
    ? (value as ClubSort)
    : "recommended";
}

function Filters() {
  const t = useTranslations("filters");
  const [query, setQuery] = useQueryStates(catalogParsers, { shallow: false });

  const cityOptions: SelectOption[] = [
    { value: "", label: t("allCities") },
    ...CITIES.map((c) => ({ value: c.slug, label: c.name })),
  ];
  const sortOptions: SelectOption[] = SORT_VALUES.map((value) => ({
    value,
    label: t(`sort.${value}`),
  }));

  function toggle<T extends string>(list: readonly T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
        <Select
          label={t("city")}
          options={cityOptions}
          value={query.city ?? ""}
          onChange={(e) => void setQuery({ city: e.target.value || null })}
        />
        <Select
          label={t("sortLabel")}
          options={sortOptions}
          value={query.sort}
          onChange={(e) => void setQuery({ sort: toSort(e.target.value) })}
        />
      </div>

      <fieldset>
        <legend className="text-label text-fg-2 mb-2 font-medium">
          {t("tableType")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {TABLE_TYPES.map((type) => (
            <Chip
              key={type}
              selected={query.types.includes(type)}
              onClick={() =>
                void setQuery({ types: toggle(query.types, type) })
              }
            >
              {TABLE_TYPE_LABELS[type]}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-label text-fg-2 mb-2 font-medium">
          {t("amenities")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {FILTERABLE_AMENITIES.map((amenity) => (
            <Chip
              key={amenity}
              selected={query.amenities.includes(amenity)}
              onClick={() =>
                void setQuery({ amenities: toggle(query.amenities, amenity) })
              }
            >
              {AMENITY_LABELS[amenity]}
            </Chip>
          ))}
        </div>
      </fieldset>
    </div>
  );
}

/**
 * Catalog filters. State lives in the URL (`shallow: false`) so the server
 * re-renders the filtered list — no client-side dataset, no hydration cost
 * that grows with the catalog. The nuqs adapter is mounted here rather than
 * at the root so only this route carries it (ADR-0006).
 */
export function CatalogFilters() {
  return (
    <NuqsAdapter>
      <Filters />
    </NuqsAdapter>
  );
}

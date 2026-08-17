"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { CITIES } from "@/entities/city";
import { TABLE_TYPES, TABLE_TYPE_LABELS } from "@/entities/club";
import { track } from "@/shared/lib/track";
import { Button } from "@/shared/ui/button";
import { Select } from "@/shared/ui/select";

const CITY_OPTIONS = CITIES.map((c) => ({ value: c.slug, label: c.name }));

/**
 * Hero search: two decisions and a commit, zero typing (MPS §4 — the hero
 * must *do something*, not just link). Navigates to the catalog with URL
 * state, so the result is shareable and server-rendered.
 */
export function QuickSearchForm({
  defaultCity = "kyiv",
}: {
  defaultCity?: string;
}) {
  const t = useTranslations("search");
  const router = useRouter();
  const [city, setCity] = useState(defaultCity);
  const [type, setType] = useState("");
  const [pending, setPending] = useState(false);

  const typeOptions = [
    { value: "", label: t("anyTable") },
    ...TABLE_TYPES.map((option) => ({
      value: option,
      label: TABLE_TYPE_LABELS[option],
    })),
  ];

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    track("cta_clicked", { id: "hero-search", context: city });
    const params = new URLSearchParams({ city });
    if (type) params.set("types", type);
    router.push(`/clubs?${params.toString()}`);
  }

  return (
    <form
      onSubmit={onSubmit}
      aria-label={t("formLabel")}
      className="bg-surface-1/70 shadow-elev-2 flex w-full flex-col gap-3 rounded-xl p-4 backdrop-blur-xl sm:flex-row sm:items-end"
    >
      <Select
        label={t("city")}
        options={CITY_OPTIONS}
        value={city}
        onChange={(e) => setCity(e.target.value)}
        className="sm:flex-1"
      />
      <Select
        label={t("tableType")}
        options={typeOptions}
        value={type}
        onChange={(e) => setType(e.target.value)}
        className="sm:flex-1"
      />
      <Button type="submit" variant="primary" size="lg" loading={pending}>
        <Search aria-hidden size={18} />
        {t("submit")}
      </Button>
    </form>
  );
}

import { SearchX } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { SearchParams } from "nuqs/server";
import { clubHref } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import {
  CatalogFilters,
  filterClubs,
  loadCatalogParams,
} from "@/features/club-search";
import { absoluteUrl, itemListJsonLd } from "@/shared/lib/seo";
import { recordEvent } from "@/entities/analytics";
import { EmptyState } from "@/shared/ui/empty-state";
import { Section } from "@/shared/ui/section";
import { ClubCard } from "@/widgets/club-card";

export const metadata: Metadata = {
  title: "Більярдні клуби України",
  description:
    "Каталог більярдних клубів: ціни, столи, години роботи. Бронювання онлайн.",
  alternates: { canonical: absoluteUrl("/clubs") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/clubs"),
    siteName: "Reserve",
    locale: "uk_UA",
  },
  twitter: { card: "summary_large_image" },
  // Filtered permutations must not compete with the canonical catalog.
  robots: { index: true, follow: true },
};

export default async function ClubsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const [query, clubs, t] = await Promise.all([
    loadCatalogParams(searchParams),
    clubRepository.all(),
    getTranslations("catalog"),
  ]);

  const results = filterClubs(clubs, query);

  // A search that found nothing is the most useful thing a visitor can tell
  // us: demand at an address we do not cover yet. Recorded with the filters
  // that produced it, so the list reads as "people wanted this, here".
  if (results.length === 0) {
    const asked = [
      query.city && `місто: ${query.city}`,
      query.types.length > 0 && `тип: ${query.types.join("/")}`,
      query.amenities.length > 0 && `зручності: ${query.amenities.join("/")}`,
      query.maxPrice !== null && `до ${Math.round(query.maxPrice / 100)} ₴`,
    ]
      .filter(Boolean)
      .join(", ");
    await recordEvent({
      name: "search_empty",
      detail: asked === "" ? "без фільтрів" : asked,
    });
  }

  return (
    <Section className="pt-28 md:pt-36">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(itemListJsonLd(results.map(clubHref))),
        }}
      />

      <header className="mb-10 flex flex-col gap-2">
        <h1 className="font-display text-display text-fg">{t("title")}</h1>
        <p className="text-body text-fg-2">
          {t("subtitle", { count: results.length })}
        </p>
      </header>

      <div className="grid gap-10 lg:grid-cols-[260px_1fr]">
        <aside aria-label={t("filtersLabel")}>
          <CatalogFilters />
        </aside>

        <div>
          {results.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t("emptyTitle")}
              description={t("emptyBody")}
              action={
                <Link
                  href="/clubs"
                  className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out"
                >
                  {t("reset")}
                </Link>
              }
            />
          ) : (
            <ul aria-label={t("results")} className="grid gap-5 sm:grid-cols-2">
              {results.map((club) => (
                <li key={club.id}>
                  <ClubCard club={club} />
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  );
}

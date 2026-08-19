import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CITIES } from "@/entities/city";
import { totalTables } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { absoluteUrl } from "@/shared/lib/seo";
import { Faq } from "@/widgets/faq";
import { FeaturedClubs } from "@/widgets/featured-clubs";
import { FinalCta } from "@/widgets/final-cta";
import { Hero } from "@/widgets/hero";
import { HowItWorks } from "@/widgets/how-it-works";

export const metadata: Metadata = {
  alternates: { canonical: absoluteUrl("/") },
  openGraph: {
    type: "website",
    url: absoluteUrl("/"),
    siteName: "Reserve",
    locale: "uk_UA",
  },
  twitter: { card: "summary_large_image" },
};

/**
 * Homepage — composed entirely of widgets (UI composition policy). All
 * sections are server components; only the hero search form hydrates.
 */
export default async function HomePage() {
  const [featured, all, t] = await Promise.all([
    clubRepository.featured(),
    clubRepository.all(),
    getTranslations("home"),
  ]);

  /**
   * Until a single club is listed, the counters count nothing — and a hero
   * that says "0 клубів, 0 столів" undersells the product to the one audience
   * that matters right now, the club owners being pitched. The row appears
   * with the first club and never has to be thought about again.
   */
  const stats =
    all.length === 0
      ? []
      : [
          { value: String(all.length), label: t("stats.clubs") },
          {
            value: String(
              all.reduce((sum, club) => sum + totalTables(club), 0),
            ),
            label: t("stats.tables"),
          },
          { value: String(CITIES.length), label: t("stats.cities") },
        ];

  return (
    <>
      <Hero stats={stats} />
      <FeaturedClubs clubs={featured} title={t("featured.title")} />
      <HowItWorks />
      <Faq />
      <FinalCta />
    </>
  );
}

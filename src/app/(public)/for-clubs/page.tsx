import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { CITIES } from "@/entities/city";
import { publicPlans } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { totalTables } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { absoluteUrl } from "@/shared/lib/seo";
import {
  ForClubsCta,
  ForClubsFaq,
  ForClubsHero,
  ForClubsValue,
  PlanComparison,
  PricingPlans,
} from "@/widgets/for-clubs";

/**
 * Prices are editable from Super Admin, so this page must never serve a
 * stale number. Short revalidation keeps it fast without ever showing a
 * price we no longer charge.
 */
/**
 * Rendered per request rather than prerendered.
 *
 * Since M2b the plans on this page come from MongoDB, and a build machine
 * has no obligation to reach the database. Prerendering would either make
 * the build depend on it or ship a pricing page with no prices until the
 * first revalidation — and this is the one page whose entire job is to
 * show prices. Server-rendered markup with no client runtime is cheap, and
 * a price an administrator just changed is live immediately.
 */
export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("forClubs.meta");
  const url = absoluteUrl("/for-clubs");
  return {
    title: t("title"),
    description: t("description"),
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title: t("title"),
      description: t("description"),
      siteName: "Reserve",
      locale: "uk_UA",
    },
    twitter: { card: "summary_large_image" },
    robots: { index: true, follow: true },
  };
}

export default async function ForClubsPage() {
  const [plans, features, clubs, t] = await Promise.all([
    billingRepository.listPlans(),
    billingRepository.listFeatures(),
    clubRepository.all(),
    getTranslations("forClubs"),
  ]);

  const visible = publicPlans(plans);
  const stats = [
    { value: `${clubs.length}+`, label: t("hero.statClubs") },
    {
      value: String(clubs.reduce((sum, club) => sum + totalTables(club), 0)),
      label: t("hero.statTables"),
    },
    { value: String(CITIES.length), label: t("hero.statCities") },
  ];

  return (
    <>
      <ForClubsHero stats={stats} />
      <ForClubsValue />
      <PricingPlans plans={visible} features={features} />
      <PlanComparison plans={visible} features={features} />
      <ForClubsFaq />
      <ForClubsCta />
    </>
  );
}

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { cityBySlug } from "@/entities/city";
import { priceFrom, todayInKyiv } from "@/entities/club";
import { clubsForStaticParams } from "@/entities/club/read";
import { clubRepository } from "@/entities/club/repository";
import { publishedReviewsOrNone } from "@/entities/review/read";
import { formatMoney } from "@/shared/lib/money";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  localBusinessJsonLd,
} from "@/shared/lib/seo";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { Section } from "@/shared/ui/section";
import { BookingBar, BookingPanel } from "@/widgets/booking-panel";
import { ClubDetails } from "@/widgets/club-details";
import { ClubHero } from "@/widgets/club-hero";
import { ClubLocation } from "@/widgets/club-location";
import { ClubReviews } from "@/widgets/club-reviews";
import { ClubTables } from "@/widgets/club-tables";
import { FeaturedClubs } from "@/widgets/featured-clubs";

/** Static per club, refreshed hourly — prices and hours change rarely. */
export const revalidate = 3600;

export async function generateStaticParams() {
  const clubs = await clubsForStaticParams();
  return clubs.map((club) => ({ city: club.city, slug: club.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city: citySlug, slug } = await params;
  const [club, city] = [
    await clubRepository.bySlug(citySlug, slug),
    cityBySlug(citySlug),
  ];
  if (!club || !city) return {};

  const t = await getTranslations("club");
  const url = absoluteUrl(`/clubs/${club.city}/${club.slug}`);
  const title = t("metaTitle", { name: club.name, city: city.locative });
  const description = t("metaDescription", {
    name: club.name,
    story: club.story,
    price: formatMoney(priceFrom(club)),
  });

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      title,
      description,
      siteName: "Reserve",
      locale: "uk_UA",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function ClubPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city: citySlug, slug } = await params;
  const club = await clubRepository.bySlug(citySlug, slug);
  const city = cityBySlug(citySlug);
  if (!club || !city) notFound();

  const [t, tCatalog, sameCity, reviews] = await Promise.all([
    getTranslations("club"),
    getTranslations("catalog"),
    clubRepository.byCity(citySlug),
    publishedReviewsOrNone(club.id),
  ]);

  const nearby = sameCity.filter((other) => other.id !== club.id);
  const breadcrumbs = [
    { name: tCatalog("home"), href: "/" },
    { name: tCatalog("title"), href: "/clubs" },
    { name: city.name, href: `/clubs/${city.slug}` },
    { name: club.name, href: `/clubs/${club.city}/${club.slug}` },
  ];

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    localBusinessJsonLd({
      name: club.name,
      description: club.story,
      url: `/clubs/${club.city}/${club.slug}`,
      telephone: club.phone,
      streetAddress: club.address.street,
      addressLocality: city.name,
      priceRange: t("priceRange", { price: formatMoney(priceFrom(club)) }),
      ...(club.rating && {
        rating: { value: club.rating.value, count: club.rating.count },
      }),
    }),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Counts the visit without making this page dynamic or shipping a
          line of JavaScript for it — see /api/e. Deliberately a bare <img>:
          next/image would optimise and cache it, and a cached counter
          counts nothing. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`/api/e?c=${club.id}`}
        alt=""
        aria-hidden
        width={1}
        height={1}
        className="pointer-events-none absolute size-px opacity-0"
      />

      <div className="mx-auto max-w-[1200px] px-6 pt-24 md:pt-28">
        <Breadcrumbs items={breadcrumbs} label={tCatalog("breadcrumbsLabel")} />
      </div>

      <ClubHero club={club} />

      <Section className="py-0 md:py-0">
        <div className="grid gap-12 lg:grid-cols-[1fr_340px] lg:gap-16">
          <div className="flex flex-col gap-12">
            <ClubTables club={club} />
            <ClubDetails club={club} today={todayInKyiv()} />
            <ClubLocation club={club} />
            <ClubReviews reviews={reviews} />
          </div>

          {/* Sticky rail: CSS-only, so it costs nothing and never lags scroll. */}
          <aside
            aria-label={t("bookingAside")}
            className="hidden lg:sticky lg:top-24 lg:block lg:self-start"
          >
            <BookingPanel club={club} />
          </aside>
        </div>
      </Section>

      {nearby.length > 0 && (
        <FeaturedClubs
          clubs={nearby}
          title={t("nearbyHeading", { city: city.locative })}
          href={`/clubs?city=${city.slug}`}
        />
      )}

      {/* Spacer so the fixed mobile bar never covers the last section. */}
      <div aria-hidden className="h-24 sm:hidden" />
      <BookingBar club={club} />
    </>
  );
}

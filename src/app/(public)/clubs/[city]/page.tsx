import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { CITIES, cityBySlug } from "@/entities/city";
import { priceFrom } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { formatMoney } from "@/shared/lib/money";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  localBusinessJsonLd,
} from "@/shared/lib/seo";
import { Breadcrumbs } from "@/shared/ui/breadcrumbs";
import { Section } from "@/shared/ui/section";
import { FeaturedClubs } from "@/widgets/featured-clubs";

/** Static city landings (MPS §2 SEO surface) — ISR-refreshed hourly. */
export const revalidate = 3600;

export function generateStaticParams() {
  return CITIES.map((city) => ({ city: city.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = cityBySlug(slug);
  if (!city) return {};

  const t = await getTranslations("catalog");
  const url = absoluteUrl(`/clubs/${city.slug}`);
  const title = t("cityTitle", { city: city.locative });
  const description = t("citySubtitle", { city: city.locative });

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

export default async function CityPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = cityBySlug(slug);
  if (!city) notFound();

  const [clubs, t] = await Promise.all([
    clubRepository.byCity(city.slug),
    getTranslations("catalog"),
  ]);

  const breadcrumbs = [
    { name: t("home"), href: "/" },
    { name: t("title"), href: "/clubs" },
    { name: city.name, href: `/clubs/${city.slug}` },
  ];

  const jsonLd = [
    breadcrumbJsonLd(breadcrumbs),
    ...clubs.map((club) =>
      localBusinessJsonLd({
        name: club.name,
        description: club.story,
        url: `/clubs/${club.city}/${club.slug}`,
        telephone: club.phone,
        streetAddress: club.address.street,
        addressLocality: city.name,
        priceRange: `від ${formatMoney(priceFrom(club))}/год`,
        ...(club.rating && {
          rating: { value: club.rating.value, count: club.rating.count },
        }),
      }),
    ),
  ];

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Section className="pt-28 pb-0 md:pt-36 md:pb-0">
        <Breadcrumbs
          items={breadcrumbs}
          label={t("breadcrumbsLabel")}
          className="mb-6"
        />
        <h1 className="font-display text-display text-fg">
          {t("cityTitle", { city: city.locative })}
        </h1>
        <p className="text-body text-fg-2 mt-2 max-w-xl">
          {t("citySubtitle", { city: city.locative })}
        </p>
      </Section>

      <FeaturedClubs
        clubs={clubs}
        title={t("results")}
        href={`/clubs?city=${city.slug}`}
      />
    </>
  );
}

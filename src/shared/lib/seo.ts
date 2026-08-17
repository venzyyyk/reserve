import { clientEnv } from "@/shared/config/env";

/** Absolute URL for canonicals, OG and JSON-LD (never relative). */
export function absoluteUrl(path: string): string {
  return new URL(path, clientEnv.NEXT_PUBLIC_APP_URL).toString();
}

export interface BreadcrumbEntry {
  name: string;
  href: string;
}

/** schema.org BreadcrumbList — pairs with the visual <Breadcrumbs>. */
export function breadcrumbJsonLd(entries: readonly BreadcrumbEntry[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: entries.map((entry, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: entry.name,
      item: absoluteUrl(entry.href),
    })),
  };
}

export interface LocalBusinessInput {
  name: string;
  description: string;
  url: string;
  telephone: string;
  streetAddress: string;
  addressLocality: string;
  priceRange: string;
  rating?: { value: number; count: number };
}

/** schema.org LocalBusiness for club and city pages (MPS §8 SEO). */
export function localBusinessJsonLd(input: LocalBusinessInput) {
  return {
    "@context": "https://schema.org",
    "@type": "SportsActivityLocation",
    name: input.name,
    description: input.description,
    url: absoluteUrl(input.url),
    telephone: input.telephone,
    priceRange: input.priceRange,
    address: {
      "@type": "PostalAddress",
      streetAddress: input.streetAddress,
      addressLocality: input.addressLocality,
      addressCountry: "UA",
    },
    ...(input.rating && {
      aggregateRating: {
        "@type": "AggregateRating",
        ratingValue: input.rating.value,
        reviewCount: input.rating.count,
      },
    }),
  };
}

export function itemListJsonLd(urls: readonly string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: urls.map((url, index) => ({
      "@type": "ListItem",
      position: index + 1,
      url: absoluteUrl(url),
    })),
  };
}

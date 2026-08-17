import type { MetadataRoute } from "next";
import { CITIES } from "@/entities/city";
import { clubHref } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { absoluteUrl } from "@/shared/lib/seo";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const clubs = await clubRepository.all();
  const now = new Date();

  return [
    {
      url: absoluteUrl("/"),
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: absoluteUrl("/clubs"),
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    ...CITIES.map((city) => ({
      url: absoluteUrl(`/clubs/${city.slug}`),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...clubs.map((club) => ({
      url: absoluteUrl(clubHref(club)),
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
  ];
}

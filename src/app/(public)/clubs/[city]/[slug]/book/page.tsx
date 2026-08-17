import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Suspense } from "react";
import { clubRepository } from "@/entities/club/repository";
import { ProductProviders } from "@/providers/product-providers";
import { Skeleton } from "@/shared/ui/skeleton";
import { BookingFlow } from "@/widgets/booking-flow";

/** The flow is live and personal — never cached, never indexed. */
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}): Promise<Metadata> {
  const { city, slug } = await params;
  const club = await clubRepository.bySlug(city, slug);
  const t = await getTranslations("flow");
  return {
    title: club ? t("metaTitle", { name: club.name }) : t("metaTitleFallback"),
    robots: { index: false, follow: false },
  };
}

export default async function BookPage({
  params,
}: {
  params: Promise<{ city: string; slug: string }>;
}) {
  const { city, slug } = await params;
  const club = await clubRepository.bySlug(city, slug);
  if (!club) notFound();

  return (
    <ProductProviders>
      <Suspense fallback={<Skeleton className="mx-6 mt-6 h-64" />}>
        <BookingFlow club={club} />
      </Suspense>
    </ProductProviders>
  );
}

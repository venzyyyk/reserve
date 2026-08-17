import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CITIES } from "@/entities/city";
import { publicPlans } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { ApplyForm } from "@/features/club-application";
import { Card } from "@/shared/ui/card";
import { Section } from "@/shared/ui/section";
import { submitApplication } from "./actions";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("apply");
  return {
    title: t("metaTitle"),
    description: t("metaDescription"),
    robots: { index: false, follow: true },
  };
}

export default async function ApplyPage({
  searchParams,
}: {
  searchParams: Promise<{ plan?: string }>;
}) {
  const [{ plan }, plans, t] = await Promise.all([
    searchParams,
    billingRepository.listPlans(),
    getTranslations("apply"),
  ]);

  const visible = publicPlans(plans);
  const requested = visible.find((option) => option.id === plan);
  const defaultPlanId = requested?.id ?? visible[0]?.id ?? "";

  return (
    <Section className="max-w-[560px] pt-28 md:pt-36">
      <div className="mb-8 flex flex-col gap-3">
        <Link
          href="/for-clubs"
          className="text-label text-fg-3 hover:text-fg duration-fast w-fit transition-colors ease-out"
        >
          {t("back")}
        </Link>
        <h1 className="font-display text-display text-fg">{t("title")}</h1>
        <p className="text-body text-fg-2">
          {requested
            ? t("subtitleWithPlan", { plan: requested.name })
            : t("subtitle")}
        </p>
      </div>

      <Card className="p-6">
        <ApplyForm
          action={submitApplication}
          defaultPlanId={defaultPlanId}
          cities={CITIES.map((city) => ({
            value: city.slug,
            label: city.name,
          }))}
          plans={visible.map((option) => ({
            value: option.id,
            label: option.name,
          }))}
        />
      </Card>
    </Section>
  );
}

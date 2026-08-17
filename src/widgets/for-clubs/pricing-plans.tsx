import { Check } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import type { Plan, PlanFeature } from "@/entities/billing";
import { cn } from "@/shared/lib/cn";
import { formatMoney, uah } from "@/shared/lib/money";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { Section } from "@/shared/ui/section";

/**
 * Pricing, rendered entirely from data. Everything here — names, prices,
 * included features, which card is emphasised — comes from the billing
 * repository, so Super Admin changes a price and this section changes.
 *
 * Only the highlighted plan gets a gold button: three gold buttons would
 * make the choice harder, not easier.
 */
export function PricingPlans({
  plans,
  features,
}: {
  plans: readonly Plan[];
  features: readonly PlanFeature[];
}) {
  const t = useTranslations("forClubs.pricing");
  const labelById = new Map(
    features.map((feature) => [feature.id, feature.label]),
  );

  return (
    <Section
      aria-labelledby="pricing-heading"
      id="pricing"
      className="scroll-mt-20"
    >
      <div className="mb-10 flex max-w-2xl flex-col gap-3">
        <h2
          id="pricing-heading"
          className="font-display text-title text-fg md:text-display"
        >
          {t("title")}
        </h2>
        <p className="text-body text-fg-2">{t("subtitle")}</p>
      </div>

      <ul className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <li key={plan.id}>
            <Card
              className={cn(
                "flex h-full flex-col gap-6 p-6",
                plan.highlighted && "shadow-glow-gold",
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-title text-fg">
                    {plan.name}
                  </h3>
                  {plan.highlighted && (
                    <Badge variant="gold">{t("popular")}</Badge>
                  )}
                </div>
                <p className="text-label text-fg-2 min-h-10">{plan.tagline}</p>
              </div>

              <div className="flex flex-col gap-1">
                <p className="font-display text-display text-fg tabular-nums">
                  {plan.priceMonthly === 0
                    ? t("free")
                    : formatMoney(uah(plan.priceMonthly))}
                </p>
                <p className="text-label text-fg-3">
                  {plan.priceMonthly === 0 ? t("freeNote") : t("perMonth")}
                </p>
                <p className="text-label text-fg-2 mt-1">
                  {plan.commissionPercent === 0
                    ? t("noCommission")
                    : t("commission", { percent: plan.commissionPercent })}
                </p>
              </div>

              <ul className="flex flex-1 flex-col gap-2.5">
                {plan.featureIds.map((featureId) => (
                  <li key={featureId} className="flex items-start gap-2.5">
                    <Check
                      aria-hidden
                      size={16}
                      className="mt-0.5 shrink-0 text-[#6FBF73]"
                    />
                    <span className="text-label text-fg-2">
                      {labelById.get(featureId) ?? featureId}
                    </span>
                  </li>
                ))}
              </ul>

              {plan.featuredDays > 0 && (
                <p className="text-label text-gold">
                  {t("featuredDays", { days: plan.featuredDays })}
                </p>
              )}

              <Link
                href={`/for-clubs/apply?plan=${plan.id}`}
                className={cn(
                  "duration-fast inline-flex h-12 items-center justify-center rounded-full px-6 font-medium transition-colors ease-out active:scale-[0.98]",
                  plan.highlighted
                    ? "bg-gold text-bg hover:bg-gold-hover focus-visible:[outline-color:var(--color-fg)]"
                    : "bg-surface-2 text-fg hover:bg-surface-3",
                )}
              >
                {t("choose", { plan: plan.name })}
              </Link>
            </Card>
          </li>
        ))}
      </ul>
    </Section>
  );
}

import { Check, Minus } from "lucide-react";
import { useTranslations } from "next-intl";
import type { Plan, PlanFeature } from "@/entities/billing";
import { cn } from "@/shared/lib/cn";
import { Section } from "@/shared/ui/section";

/**
 * The comparison table. A real <table> — it is tabular data, and screen
 * readers and find-in-page both depend on that. Horizontal scroll on
 * mobile with a sticky first column, so the feature name never leaves the
 * screen while comparing.
 *
 * Absent features are a dash, not a red cross: this page sells, and the
 * Basic column is still a plan we want clubs to take.
 */
export function PlanComparison({
  plans,
  features,
}: {
  plans: readonly Plan[];
  features: readonly PlanFeature[];
}) {
  const t = useTranslations("forClubs.comparison");

  return (
    <Section aria-labelledby="comparison-heading">
      <h2
        id="comparison-heading"
        className="font-display text-title text-fg md:text-display mb-8"
      >
        {t("title")}
      </h2>

      <div className="-mx-6 overflow-x-auto px-6">
        <table className="w-full min-w-[560px] border-collapse">
          <caption className="sr-only">{t("caption")}</caption>
          <thead>
            <tr>
              <th
                scope="col"
                className="text-label text-fg-3 bg-bg sticky left-0 z-10 pb-4 text-left font-medium"
              >
                {t("feature")}
              </th>
              {plans.map((plan) => (
                <th
                  key={plan.id}
                  scope="col"
                  className="text-heading text-fg px-4 pb-4 text-center font-semibold"
                >
                  {plan.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {features.map((feature) => (
              <tr key={feature.id} className="border-line border-t">
                <th
                  scope="row"
                  className="bg-bg sticky left-0 z-10 py-4 pr-4 text-left font-normal"
                >
                  <span className="text-body text-fg">{feature.label}</span>
                  {feature.hint && (
                    <span className="text-caption text-fg-3 block">
                      {feature.hint}
                    </span>
                  )}
                </th>
                {plans.map((plan) => {
                  const included = plan.featureIds.includes(feature.id);
                  return (
                    <td key={plan.id} className="px-4 py-4 text-center">
                      {included ? (
                        <>
                          <Check
                            aria-hidden
                            size={18}
                            className="mx-auto text-[#6FBF73]"
                          />
                          <span className="sr-only">{t("included")}</span>
                        </>
                      ) : (
                        <>
                          <Minus
                            aria-hidden
                            size={18}
                            className="text-fg-3 mx-auto"
                          />
                          <span className="sr-only">{t("notIncluded")}</span>
                        </>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}

            <tr className="border-line border-t">
              <th
                scope="row"
                className="bg-bg text-body text-fg sticky left-0 z-10 py-4 pr-4 text-left font-normal"
              >
                {t("commission")}
              </th>
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className={cn(
                    "text-body px-4 py-4 text-center tabular-nums",
                    plan.commissionPercent === 0 ? "text-[#6FBF73]" : "text-fg",
                  )}
                >
                  {plan.commissionPercent}%
                </td>
              ))}
            </tr>

            <tr className="border-line border-t">
              <th
                scope="row"
                className="bg-bg text-body text-fg sticky left-0 z-10 py-4 pr-4 text-left font-normal"
              >
                {t("featuredPeriod")}
              </th>
              {plans.map((plan) => (
                <td
                  key={plan.id}
                  className="text-body text-fg px-4 py-4 text-center tabular-nums"
                >
                  {plan.featuredDays > 0 ? (
                    t("days", { days: plan.featuredDays })
                  ) : (
                    <>
                      <Minus
                        aria-hidden
                        size={18}
                        className="text-fg-3 mx-auto"
                      />
                      <span className="sr-only">{t("notIncluded")}</span>
                    </>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </Section>
  );
}

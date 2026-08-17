import { getTranslations } from "next-intl/server";
import { billingRepository } from "@/entities/billing/repository";
import { Card } from "@/shared/ui/card";
import { AdminPage } from "@/widgets/superadmin";
import { savePlan } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Plan editor — the reason pricing is data.
 *
 * One form per plan, saved independently: editing VIP must never risk
 * PRO. Prices are entered in hryvnia (1490), stored in kopiykas — the
 * admin should never think about the storage unit. Everything changed
 * here is live on /for-clubs within a minute, with no deploy.
 */
export default async function PlansPage() {
  const [t, plans, features] = await Promise.all([
    getTranslations("superadmin.plans"),
    billingRepository.listPlans(),
    billingRepository.listFeatures(),
  ]);

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <div className="flex flex-col gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className="p-5">
            <form action={savePlan} className="flex flex-col gap-5">
              <input type="hidden" name="id" value={plan.id} />

              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="font-display text-title text-fg">{plan.name}</h2>
                <span className="text-caption text-fg-3 uppercase">
                  {plan.tier}
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-2 font-medium">
                    {t("name")}
                  </span>
                  <input
                    name="name"
                    defaultValue={plan.name}
                    required
                    maxLength={40}
                    className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-2 font-medium">
                    {t("priceUah")}
                  </span>
                  <input
                    name="priceUah"
                    type="number"
                    min={0}
                    step={10}
                    defaultValue={plan.priceMonthly / 100}
                    className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
                  />
                </label>

                <label className="flex flex-col gap-1.5 sm:col-span-2">
                  <span className="text-label text-fg-2 font-medium">
                    {t("tagline")}
                  </span>
                  <input
                    name="tagline"
                    defaultValue={plan.tagline}
                    required
                    maxLength={90}
                    className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-2 font-medium">
                    {t("commission")}
                  </span>
                  <input
                    name="commissionPercent"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    defaultValue={plan.commissionPercent}
                    className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-2 font-medium">
                    {t("featuredDays")}
                  </span>
                  <input
                    name="featuredDays"
                    type="number"
                    min={0}
                    max={365}
                    defaultValue={plan.featuredDays}
                    className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
                  />
                  <span className="text-caption text-fg-3">
                    {t("featuredDaysHint")}
                  </span>
                </label>
              </div>

              <fieldset className="flex flex-col gap-2">
                <legend className="text-label text-fg-2 mb-2 font-medium">
                  {t("features")}
                </legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {features.map((feature) => (
                    <label
                      key={feature.id}
                      className="bg-surface-2 flex items-start gap-2.5 rounded-sm p-3"
                    >
                      <input
                        type="checkbox"
                        name="featureIds"
                        value={feature.id}
                        defaultChecked={plan.featureIds.includes(feature.id)}
                        className="accent-gold mt-0.5 size-4"
                      />
                      <span className="text-label text-fg">
                        {feature.label}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <fieldset className="flex flex-wrap gap-4">
                <legend className="sr-only">{t("flags")}</legend>
                {[
                  { name: "homepageBanner", checked: plan.homepageBanner },
                  {
                    name: "priorityRecommendations",
                    checked: plan.priorityRecommendations,
                  },
                  { name: "highlighted", checked: plan.highlighted },
                  { name: "active", checked: plan.active },
                ].map((flag) => (
                  <label key={flag.name} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      name={flag.name}
                      defaultChecked={flag.checked}
                      className="accent-gold size-4"
                    />
                    <span className="text-label text-fg-2">
                      {t(`flag.${flag.name}`)}
                    </span>
                  </label>
                ))}
              </fieldset>

              <button
                type="submit"
                className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 w-fit items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
              >
                {t("save")}
              </button>
            </form>
          </Card>
        ))}
      </div>
    </AdminPage>
  );
}

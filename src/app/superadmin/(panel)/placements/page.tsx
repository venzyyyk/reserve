import { getTranslations } from "next-intl/server";
import { daysLeft, hasBanner, isFeatured } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { clubRepository } from "@/entities/club/repository";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { AdminPage } from "@/widgets/superadmin";
import { savePlacement } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Featured windows and homepage banners.
 *
 * Windows are set in days from today rather than as end dates, because
 * that is how the sale is agreed ("30 днів VIP"). The current state is
 * always shown next to the control, so nobody has to guess what they are
 * about to overwrite.
 */
export default async function PlacementsPage() {
  const [t, clubs, plans, placements] = await Promise.all([
    getTranslations("superadmin.placements"),
    clubRepository.all(),
    billingRepository.listPlans(),
    billingRepository.listPlacements(),
  ]);

  const byClub = new Map(placements.map((item) => [item.clubId, item]));

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <div className="flex flex-col gap-4">
        {clubs.map((club) => {
          const placement = byClub.get(club.id);
          const currentPlan = placement
            ? plans.find((plan) => plan.id === placement.planId)
            : undefined;
          const featured = isFeatured(placement);
          const banner = hasBanner(placement);

          return (
            <Card key={club.id} className="p-5">
              <form action={savePlacement} className="flex flex-col gap-4">
                <input type="hidden" name="clubId" value={club.id} />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-col gap-1">
                    <h2 className="text-heading text-fg font-semibold">
                      {club.name}
                    </h2>
                    <p className="text-caption text-fg-3">
                      {currentPlan ? currentPlan.name : t("noPlan")}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {featured && (
                      <Badge variant="gold">
                        {t("featuredLeft", {
                          days: daysLeft(placement?.featuredUntil ?? null),
                        })}
                      </Badge>
                    )}
                    {banner && (
                      <Badge variant="felt">
                        {t("bannerLeft", {
                          days: daysLeft(placement?.bannerUntil ?? null),
                        })}
                      </Badge>
                    )}
                    {!featured && !banner && (
                      <Badge variant="neutral">{t("standard")}</Badge>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <label className="flex flex-col gap-1.5">
                    <span className="text-label text-fg-2 font-medium">
                      {t("plan")}
                    </span>
                    <select
                      name="planId"
                      defaultValue={placement?.planId ?? plans[0]?.id}
                      className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
                    >
                      {plans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.name}
                        </option>
                      ))}
                    </select>
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
                      defaultValue={daysLeft(placement?.featuredUntil ?? null)}
                      className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
                    />
                  </label>

                  <label className="flex flex-col gap-1.5">
                    <span className="text-label text-fg-2 font-medium">
                      {t("bannerDays")}
                    </span>
                    <input
                      name="bannerDays"
                      type="number"
                      min={0}
                      max={365}
                      defaultValue={daysLeft(placement?.bannerUntil ?? null)}
                      className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4 tabular-nums"
                    />
                  </label>
                </div>

                <label className="flex flex-col gap-1.5">
                  <span className="text-label text-fg-2 font-medium">
                    {t("bannerHeadline")}
                  </span>
                  <input
                    name="bannerHeadline"
                    maxLength={80}
                    defaultValue={placement?.bannerHeadline ?? ""}
                    placeholder={club.story}
                    className="bg-surface-2 text-body text-fg placeholder:text-fg-3 h-12 rounded-sm px-4"
                  />
                  <span className="text-caption text-fg-3">
                    {t("bannerHeadlineHint")}
                  </span>
                </label>

                <button
                  type="submit"
                  className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 w-fit items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
                >
                  {t("save")}
                </button>
              </form>
            </Card>
          );
        })}
      </div>
    </AdminPage>
  );
}

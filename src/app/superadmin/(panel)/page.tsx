import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { applicationRepository } from "@/entities/application/repository";
import { isFeatured, hasBanner } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { clubRepository } from "@/entities/club/repository";
import { reviewRepository } from "@/entities/review/repository";
import { userRepository } from "@/entities/user/repository";
import { formatMoney, uah } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";
import { AdminPage, StatCard } from "@/widgets/superadmin";

export const dynamic = "force-dynamic";

/**
 * Platform overview. Ordered by what needs a decision today, not by what
 * is easiest to count: queues first, money second, inventory third.
 */
export default async function SuperAdminOverview() {
  const [t, clubs, plans, placements, pendingApps, pendingReviews, users] =
    await Promise.all([
      getTranslations("superadmin.overview"),
      clubRepository.all(),
      billingRepository.listPlans(),
      billingRepository.listPlacements(),
      applicationRepository.countPending(),
      reviewRepository.countPending(),
      userRepository.count(),
    ]);

  const planById = new Map(plans.map((plan) => [plan.id, plan]));
  const paying = placements.filter(
    (placement) => (planById.get(placement.planId)?.priceMonthly ?? 0) > 0,
  );
  const mrr = paying.reduce(
    (sum, placement) =>
      sum + (planById.get(placement.planId)?.priceMonthly ?? 0),
    0,
  );
  const featured = placements.filter((placement) =>
    isFeatured(placement),
  ).length;
  const banners = placements.filter((placement) => hasBanner(placement)).length;

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <section aria-labelledby="queues" className="flex flex-col gap-4">
        <h2 id="queues" className="text-heading text-fg font-semibold">
          {t("queues")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Link href="/superadmin/applications" className="rounded-lg">
            <StatCard
              label={t("pendingApplications")}
              value={String(pendingApps)}
              hint={pendingApps > 0 ? t("needsDecision") : t("allClear")}
              tone={pendingApps > 0 ? "gold" : "neutral"}
            />
          </Link>
          <Link href="/superadmin/reviews" className="rounded-lg">
            <StatCard
              label={t("pendingReviews")}
              value={String(pendingReviews)}
              hint={pendingReviews > 0 ? t("needsDecision") : t("allClear")}
              tone={pendingReviews > 0 ? "gold" : "neutral"}
            />
          </Link>
        </div>
      </section>

      <section aria-labelledby="money" className="flex flex-col gap-4">
        <h2 id="money" className="text-heading text-fg font-semibold">
          {t("money")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard
            label={t("mrr")}
            value={formatMoney(uah(mrr))}
            hint={t("mrrHint", { count: paying.length })}
            tone="felt"
          />
          <StatCard label={t("featured")} value={String(featured)} />
          <StatCard label={t("banners")} value={String(banners)} />
        </div>
      </section>

      <section aria-labelledby="platform" className="flex flex-col gap-4">
        <h2 id="platform" className="text-heading text-fg font-semibold">
          {t("platform")}
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label={t("clubs")} value={String(clubs.length)} />
          <StatCard label={t("users")} value={String(users)} />
          <StatCard
            label={t("plans")}
            value={String(plans.filter((plan) => plan.active).length)}
          />
        </div>
      </section>

      {placements.length === 0 && (
        <Card className="p-5">
          <p className="text-body text-fg-2">
            {t.rich("noPlacements", {
              link: (chunks) => (
                <Link
                  href="/superadmin/placements"
                  className="text-gold hover:text-gold-hover"
                >
                  {chunks}
                </Link>
              ),
            })}
          </p>
        </Card>
      )}
    </AdminPage>
  );
}

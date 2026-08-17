import { getTranslations } from "next-intl/server";
import {
  REPORT_DAYS,
  conversionRate,
  sinceIso,
  type ClubFunnel,
} from "@/entities/analytics";
import { analyticsRepository } from "@/entities/analytics/repository";
import { clubRepository } from "@/entities/club/repository";
import { formatMoney, uah } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";
import { AdminPage, AdminTable, StatCard } from "@/widgets/superadmin";

export const dynamic = "force-dynamic";

/**
 * The commercial picture, over the last thirty days.
 *
 * Three questions, in the order they get asked: is anyone coming, does what
 * they see turn into bookings, and where should we open next. The last one
 * is the empty-search list — the only table here that describes clubs we do
 * not have.
 */
export default async function AnalyticsPage() {
  const since = sinceIso(REPORT_DAYS);

  const [t, clubs, funnels, sources, empty] = await Promise.all([
    getTranslations("superadmin.analytics"),
    clubRepository.all(),
    analyticsRepository.funnels(since),
    analyticsRepository.sources(since),
    analyticsRepository.emptySearches(since, 10),
  ]);

  const clubName = (id: string) =>
    clubs.find((club) => club.id === id)?.name ?? id;

  const totals = funnels.reduce(
    (sum, funnel) => ({
      viewed: sum.viewed + funnel.viewed,
      started: sum.started + funnel.started,
      paid: sum.paid + funnel.paid,
      revenue: sum.revenue + funnel.revenue,
    }),
    { viewed: 0, started: 0, paid: 0, revenue: 0 },
  );

  const rate = conversionRate(totals);
  const rateLabel = rate === null ? "—" : `${rate.toLocaleString("uk-UA")}%`;

  const dateLabel = (iso: string): string =>
    new Intl.DateTimeFormat("uk-UA", {
      day: "numeric",
      month: "short",
      timeZone: "Europe/Kyiv",
    }).format(new Date(iso));

  const nothingYet = totals.viewed === 0 && empty.length === 0;

  return (
    <AdminPage
      title={t("title")}
      description={t("description", { days: REPORT_DAYS })}
    >
      {nothingYet ? (
        <Card className="p-6">
          <p className="text-body text-fg-2">{t("noData")}</p>
        </Card>
      ) : (
        <>
          <section aria-labelledby="totals" className="flex flex-col gap-4">
            <h2 id="totals" className="text-heading text-fg font-semibold">
              {t("totals")}
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label={t("viewed")} value={String(totals.viewed)} />
              <StatCard label={t("started")} value={String(totals.started)} />
              <StatCard label={t("paid")} value={String(totals.paid)} />
              <StatCard
                label={t("revenue")}
                value={formatMoney(uah(totals.revenue))}
              />
            </div>
            <p className="text-label text-fg-3">
              {t("conversion", { rate: rateLabel })}
            </p>
          </section>

          {funnels.length > 0 && (
            <section aria-labelledby="byClub" className="flex flex-col gap-4">
              <h2 id="byClub" className="text-heading text-fg font-semibold">
                {t("byClub")}
              </h2>
              <AdminTable
                caption={t("byClubCaption")}
                head={[
                  t("club"),
                  t("viewed"),
                  t("started"),
                  t("paid"),
                  t("revenue"),
                  t("conversionShort"),
                ]}
              >
                {funnels.map((funnel: ClubFunnel) => {
                  const clubRate = conversionRate(funnel);
                  return (
                    <tr key={funnel.clubId} className="border-line border-b">
                      <td className="text-label text-fg py-3 pr-3 font-medium">
                        {clubName(funnel.clubId)}
                      </td>
                      <td className="text-label text-fg-2 px-3 py-3 tabular-nums">
                        {funnel.viewed}
                      </td>
                      <td className="text-label text-fg-2 px-3 py-3 tabular-nums">
                        {funnel.started}
                      </td>
                      <td className="text-label text-fg px-3 py-3 tabular-nums">
                        {funnel.paid}
                      </td>
                      <td className="text-label text-fg px-3 py-3 tabular-nums">
                        {formatMoney(uah(funnel.revenue))}
                      </td>
                      <td className="text-label text-fg-2 px-3 py-3 tabular-nums">
                        {clubRate === null
                          ? "—"
                          : `${clubRate.toLocaleString("uk-UA")}%`}
                      </td>
                    </tr>
                  );
                })}
              </AdminTable>
            </section>
          )}

          <section aria-labelledby="demand" className="flex flex-col gap-4">
            <h2 id="demand" className="text-heading text-fg font-semibold">
              {t("demand")}
            </h2>
            <p className="text-label text-fg-3">{t("demandHint")}</p>
            {empty.length === 0 ? (
              <p className="text-body text-fg-3">{t("demandEmpty")}</p>
            ) : (
              <AdminTable
                caption={t("demandCaption")}
                head={[t("searched"), t("times"), t("lastTime")]}
              >
                {empty.map((row) => (
                  <tr key={row.detail} className="border-line border-b">
                    <td className="text-label text-fg py-3 pr-3">
                      {row.detail}
                    </td>
                    <td className="text-label text-fg px-3 py-3 tabular-nums">
                      {row.count}
                    </td>
                    <td className="text-label text-fg-3 px-3 py-3">
                      {dateLabel(row.lastAt)}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            )}
          </section>

          {sources.length > 0 && (
            <section aria-labelledby="sources" className="flex flex-col gap-4">
              <h2 id="sources" className="text-heading text-fg font-semibold">
                {t("sources")}
              </h2>
              <AdminTable
                caption={t("sourcesCaption")}
                head={[t("source"), t("events")]}
              >
                {sources.map((row) => (
                  <tr key={row.source} className="border-line border-b">
                    <td className="text-label text-fg py-3 pr-3">
                      {row.source}
                    </td>
                    <td className="text-label text-fg px-3 py-3 tabular-nums">
                      {row.count}
                    </td>
                  </tr>
                ))}
              </AdminTable>
            </section>
          )}
        </>
      )}
    </AdminPage>
  );
}

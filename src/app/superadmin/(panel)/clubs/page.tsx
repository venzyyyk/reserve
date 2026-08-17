import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { daysLeft, isFeatured } from "@/entities/billing";
import { billingRepository } from "@/entities/billing/repository";
import { cityBySlug } from "@/entities/city";
import { clubHref, priceFrom, totalTables } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { formatMoney } from "@/shared/lib/money";
import { Badge } from "@/shared/ui/badge";
import { AdminPage, AdminTable } from "@/widgets/superadmin";
import { setClubPublished } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Every club on the platform — drafts first, because those are the ones
 * with work outstanding — with its commercial state beside it.
 */
export default async function ClubsPage() {
  const [t, clubs, plans, placements] = await Promise.all([
    getTranslations("superadmin.clubs"),
    clubRepository.allIncludingDrafts(),
    billingRepository.listPlans(),
    billingRepository.listPlacements(),
  ]);

  const byClub = new Map(placements.map((item) => [item.clubId, item]));
  const planName = (id?: string) =>
    plans.find((plan) => plan.id === id)?.name ?? "—";

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/superadmin/clubs/new"
          className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
        >
          {t("add")}
        </Link>
        <p className="text-label text-fg-3">{t("addHint")}</p>
      </div>

      <AdminTable
        caption={t("caption")}
        head={[
          t("club"),
          t("city"),
          t("tables"),
          t("priceFrom"),
          t("booking"),
          t("plan"),
          t("featured"),
          "",
        ]}
      >
        {clubs.map((club) => {
          const placement = byClub.get(club.id);
          const featured = isFeatured(placement);
          return (
            <tr key={club.id} className="border-line border-b">
              <td className="py-3 pr-3">
                <Link
                  href={`/superadmin/clubs/${club.id}`}
                  className="text-label text-fg hover:text-gold duration-fast font-medium transition-colors ease-out"
                >
                  {club.name}
                </Link>
                {!club.published && (
                  <span className="text-caption text-fg-3 block">
                    {t("draft")}
                  </span>
                )}
              </td>
              <td className="text-label text-fg-2 px-3 py-3">
                {cityBySlug(club.city)?.name ?? club.city}
              </td>
              <td className="text-label text-fg px-3 py-3 tabular-nums">
                {totalTables(club)}
              </td>
              <td className="text-label text-fg px-3 py-3 tabular-nums">
                {formatMoney(priceFrom(club))}
              </td>
              <td className="px-3 py-3">
                {club.onlineBooking ? (
                  <Badge variant="felt">{t("bookingOnline")}</Badge>
                ) : (
                  <Badge variant="neutral">{t("bookingPhone")}</Badge>
                )}
              </td>
              <td className="text-label text-fg-2 px-3 py-3">
                {planName(placement?.planId)}
              </td>
              <td className="px-3 py-3">
                {featured ? (
                  <Badge variant="gold">
                    {t("daysLeft", {
                      days: daysLeft(placement?.featuredUntil ?? null),
                    })}
                  </Badge>
                ) : (
                  <span className="text-label text-fg-3">—</span>
                )}
              </td>
              <td className="py-3 pl-3 text-right">
                <div className="flex flex-wrap justify-end gap-3">
                  {club.published && (
                    <Link
                      href={clubHref(club)}
                      className="text-label text-fg-3 hover:text-fg duration-fast transition-colors ease-out"
                    >
                      {t("view")}
                    </Link>
                  )}
                  <form action={setClubPublished}>
                    <input type="hidden" name="id" value={club.id} />
                    <input
                      type="hidden"
                      name="published"
                      value={club.published ? "false" : "true"}
                    />
                    <button
                      type="submit"
                      className="text-label text-fg-3 hover:text-fg duration-fast transition-colors ease-out"
                    >
                      {club.published ? t("unpublish") : t("publish")}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          );
        })}
      </AdminTable>

      <p className="text-label text-fg-3">
        {t("placementHint")}{" "}
        <Link
          href="/superadmin/placements"
          className="text-gold hover:text-gold-hover"
        >
          {t("placementLink")}
        </Link>
      </p>
    </AdminPage>
  );
}

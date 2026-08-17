import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { isBookable, priceFrom, totalTables, type Club } from "@/entities/club";
import { flags } from "@/shared/config/flags";
import { formatMoney } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";
import { OpenStatusBadge } from "@/widgets/club-card";

/**
 * Conversion surface, rendered twice by the page: as a sticky desktop rail
 * and as a fixed mobile bar.
 *
 * Two things decide whether it offers a checkout: the platform flag, and
 * whether this particular club has online booking at all. A club on the
 * free listing tier gets the phone-call version — stated plainly, because a
 * "Забронювати" button leading nowhere would spend the trust the rest of
 * the page earns.
 */
export function BookingPanel({ club }: { club: Club }) {
  const t = useTranslations("club");
  const price = formatMoney(priceFrom(club));

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col">
          <p className="text-price text-fg font-semibold tabular-nums">
            {t("priceFrom", { price })}
            <span className="text-label text-fg-2 font-normal">
              {t("perHour")}
            </span>
          </p>
          <p className="text-label text-fg-3">
            {t("tableCount", { count: totalTables(club) })}
          </p>
        </div>
        <OpenStatusBadge club={club} />
      </div>

      {flags.onlineBooking && isBookable(club) ? (
        <a
          href={`/clubs/${club.city}/${club.slug}/book`}
          className="bg-gold text-bg hover:bg-gold-hover duration-fast inline-flex h-14 items-center justify-center rounded-full px-8 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
        >
          {t("bookOnline")}
        </a>
      ) : (
        <>
          <a
            href={`tel:${club.phone}`}
            className="bg-gold text-bg hover:bg-gold-hover duration-fast inline-flex h-14 items-center justify-center gap-2 rounded-full px-8 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            <Phone aria-hidden size={18} />
            {t("callToBook")}
          </a>
          <p className="text-label text-fg-3 text-center">{t("onlineSoon")}</p>
        </>
      )}
    </Card>
  );
}

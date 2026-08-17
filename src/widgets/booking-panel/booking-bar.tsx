import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { isBookable, priceFrom, type Club } from "@/entities/club";
import { flags } from "@/shared/config/flags";
import { formatMoney } from "@/shared/lib/money";

/**
 * Mobile booking bar: price on the left, action on the right, pinned above
 * the tab bar and inside the safe area. Fixed rather than scroll-aware —
 * hiding it on scroll saves 64px and costs a scroll listener plus the
 * moment where the user looks for it and it is gone.
 */
export function BookingBar({ club }: { club: Club }) {
  const t = useTranslations("club");

  return (
    <div
      className="border-line bg-surface-1/90 fixed inset-x-0 bottom-16 z-30 border-t px-4 py-3 backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-col">
          <p className="text-body text-fg font-semibold tabular-nums">
            {t("priceFrom", { price: formatMoney(priceFrom(club)) })}
            <span className="text-label text-fg-2 font-normal">
              {t("perHour")}
            </span>
          </p>
          {!flags.onlineBooking && (
            <p className="text-caption text-fg-3">{t("onlineSoonShort")}</p>
          )}
        </div>

        {flags.onlineBooking && isBookable(club) ? (
          <a
            href={`/clubs/${club.city}/${club.slug}/book`}
            className="bg-gold text-bg hover:bg-gold-hover duration-fast inline-flex h-12 shrink-0 items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            {t("book")}
          </a>
        ) : (
          <a
            href={`tel:${club.phone}`}
            className="bg-gold text-bg hover:bg-gold-hover duration-fast inline-flex h-12 shrink-0 items-center gap-2 rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            <Phone aria-hidden size={16} />
            {t("call")}
          </a>
        )}
      </div>
    </div>
  );
}

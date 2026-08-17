import { MapPin, Navigation, Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  TABLE_TYPE_LABELS,
  directionsUrl,
  priceFrom,
  totalTables,
  type Club,
} from "@/entities/club";
import { formatMoney } from "@/shared/lib/money";
import { OpenStatusBadge } from "@/widgets/club-card";
import { ShareButton } from "./share-button";

/**
 * Club hero. The cover is the same designed no-photo treatment as the card
 * (ADR-0004), scaled up: club-hue felt gradient, overhead lamp wash, and the
 * monogram as a watermark. Everything a visitor needs to decide "is this the
 * right club?" sits above the fold — status, area, inventory, price floor.
 */
export function ClubHero({ club }: { club: Club }) {
  const t = useTranslations("club");
  const phoneHref = `tel:${club.phone}`;
  const displayPhone = club.phone.replace(
    /^(\+380)(\d{2})(\d{3})(\d{2})(\d{2})$/,
    "$1 $2 $3 $4 $5",
  );

  return (
    <header className="relative isolate">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background: `radial-gradient(90% 70% at 50% -20%, hsl(${club.accentHue} 32% 22% / 0.9), transparent 65%), radial-gradient(50% 40% at 80% 0%, rgb(200 155 60 / 0.14), transparent 70%), var(--color-bg)`,
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-32"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-bg))",
        }}
      />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-6 px-6 pt-6 pb-10 md:pb-14">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <OpenStatusBadge club={club} />
            <span className="text-label text-fg-3">
              {t("tablesAndTypes", {
                count: totalTables(club),
                types: club.tables
                  .map((table) => TABLE_TYPE_LABELS[table.type])
                  .join(" · "),
              })}
            </span>
          </div>

          <h1 className="font-display text-display text-fg md:text-display-xl">
            {club.name}
          </h1>

          <p className="text-body text-fg-2 flex flex-wrap items-center gap-x-2 gap-y-1">
            <MapPin aria-hidden size={16} className="text-fg-3" />
            {club.address.street}
            <span aria-hidden className="text-fg-3">
              ·
            </span>
            {club.address.district}
            {club.address.metro && (
              <>
                <span aria-hidden className="text-fg-3">
                  ·
                </span>
                {t("metroWalk", {
                  minutes: club.address.metro.walkMinutes,
                  metro: club.address.metro.name,
                })}
              </>
            )}
          </p>

          <p className="text-price text-fg font-semibold tabular-nums">
            {t("priceFrom", { price: formatMoney(priceFrom(club)) })}
            <span className="text-label text-fg-2 font-normal">
              {t("perHour")}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <a
            href={phoneHref}
            className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
          >
            <Phone aria-hidden size={16} />
            {displayPhone}
          </a>
          <a
            href={directionsUrl(club)}
            target="_blank"
            rel="noreferrer noopener"
            className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
          >
            <Navigation aria-hidden size={16} />
            {t("directions")}
          </a>
          <ShareButton title={club.name} text={club.story} />
        </div>
      </div>
    </header>
  );
}

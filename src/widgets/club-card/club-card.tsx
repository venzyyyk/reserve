import Link from "next/link";
import { useTranslations } from "next-intl";
import {
  TABLE_TYPE_LABELS,
  clubHref,
  priceFrom,
  totalTables,
  type Club,
} from "@/entities/club";
import { formatMoney } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";
import { OpenStatusBadge } from "./open-status-badge";

/**
 * Catalog/city/featured club card. The cover is the designed no-photo
 * treatment (ADR-0004): accent-hue felt gradient, overhead lamp wash and the
 * club monogram — clubs onboard before their photography does.
 *
 * Tokens: Card (surface-1 + elev-1, lift on hover), radius-lg, text scale,
 * duration-fast/ease-out. No visual exceptions.
 */
export function ClubCard({ club }: { club: Club }) {
  const t = useTranslations("clubCard");
  const price = formatMoney(priceFrom(club));

  return (
    /**
     * No `aria-label`. The card already contains the club's name, district,
     * table count and price as real text, so an `aria-label` does not add
     * information — it *replaces* what a screen reader would otherwise read,
     * and ours paraphrased it ("за годину" against a visible "/год", district
     * without the metro line). axe reports that as
     * `label-content-name-mismatch`, and it also breaks voice control, where
     * the spoken command has to match the visible words.
     */
    <Link href={clubHref(club)} className="group block rounded-lg">
      <Card interactive className="overflow-hidden">
        <div
          aria-hidden
          className="relative flex h-40 items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(150deg, hsl(${club.accentHue} 28% 14%) 0%, #0b0b0b 85%)`,
          }}
        >
          <div
            className="absolute inset-x-0 top-0 h-24 opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 60% 100% at 50% 0%, rgb(255 255 255 / 0.08), transparent)",
            }}
          />
          <span className="font-display text-display text-fg/20 duration-fast transition-transform ease-out group-hover:scale-105">
            {club.name.charAt(0)}
          </span>
        </div>

        <div className="flex flex-col gap-3 p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-heading text-fg font-semibold">
                {club.name}
              </h3>
              <p className="text-label text-fg-2">
                {club.address.metro
                  ? t("districtWithMetro", {
                      district: club.address.district,
                      minutes: club.address.metro.walkMinutes,
                      metro: club.address.metro.name,
                    })
                  : club.address.district}
              </p>
            </div>
            <OpenStatusBadge club={club} />
          </div>

          <div className="flex items-end justify-between gap-3">
            <p className="text-label text-fg-2">
              {t("tables", { count: totalTables(club) })} ·{" "}
              {club.tables
                .map((table) => TABLE_TYPE_LABELS[table.type])
                .join(" · ")}
            </p>
            <p className="text-body text-fg font-semibold tabular-nums">
              {t("priceFrom", { price })}
              <span className="text-fg-2 font-normal">{t("perHour")}</span>
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}

import { useTranslations } from "next-intl";
import { TABLE_TYPE_LABELS, type Club } from "@/entities/club";
import { formatMoney, uah } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";

/**
 * Tables and pricing — the block that answers "is this worth my money?".
 * One row per table group, price given the visual weight because that is
 * what people compare between clubs. Brand and size appear only when the
 * club actually told us, never as an empty label.
 */
export function ClubTables({ club }: { club: Club }) {
  const t = useTranslations("club");

  return (
    <section aria-labelledby="tables-heading" className="flex flex-col gap-5">
      <h2
        id="tables-heading"
        className="font-display text-title text-fg scroll-mt-24"
      >
        {t("tablesHeading")}
      </h2>

      <ul className="flex flex-col gap-3">
        {club.tables.map((group) => (
          <li key={group.type}>
            <Card className="flex flex-wrap items-center justify-between gap-4 p-5">
              <div className="flex flex-col gap-1">
                <p className="text-heading text-fg font-semibold">
                  {TABLE_TYPE_LABELS[group.type]}
                </p>
                <p className="text-label text-fg-2">
                  {t("tableCount", { count: group.count })}
                  {group.sizeFt
                    ? ` · ${t("feet", { size: group.sizeFt })}`
                    : ""}
                  {group.brand ? ` · ${group.brand}` : ""}
                </p>
              </div>
              <p className="text-price text-fg font-semibold tabular-nums">
                {formatMoney(uah(group.pricePerHourFrom))}
                <span className="text-label text-fg-2 font-normal">
                  {t("perHour")}
                </span>
              </p>
            </Card>
          </li>
        ))}
      </ul>

      <p className="text-label text-fg-3">{t("priceNote")}</p>
    </section>
  );
}

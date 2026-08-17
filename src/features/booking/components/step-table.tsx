"use client";

import { useTranslations } from "next-intl";
import {
  TABLE_TYPE_LABELS,
  TABLE_TYPES,
  type TableType,
} from "@/entities/club";
import {
  availableStarts,
  formatMinutes,
  nextFreeStart,
  priceFor,
  type Minutes,
  type Occupancy,
  type Table,
} from "@/entities/booking";
import type { Club } from "@/entities/club";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { Chip } from "@/shared/ui/chip";

/**
 * Step 2 — the table.
 *
 * MPS §5 specifies an interactive SVG floor plan here. This is the interim
 * list the roadmap called for (M2a), and it is deliberately not a
 * placeholder: it shows exactly what the plan will — number, type, price,
 * and when a busy table frees up — so the booking flow could ship and earn
 * money before the plan exists. The floor plan replaces this view at M3
 * without changing a single step of the flow.
 *
 * Busy tables stay visible with their next free time rather than
 * disappearing: "стіл №3 вільний з 21:30" is useful; a shorter list is not.
 */
export function StepTable({
  club,
  date,
  duration,
  tables,
  occupied,
  value,
  onSelect,
  typeFilter,
  onTypeFilter,
}: {
  club: Club;
  date: string;
  duration: Minutes;
  tables: readonly Table[];
  occupied: readonly Occupancy[];
  value: string | null;
  onSelect: (tableId: string) => void;
  typeFilter: TableType | null;
  onTypeFilter: (type: TableType | null) => void;
}) {
  const t = useTranslations("flow");
  const offeredTypes = TABLE_TYPES.filter((type) =>
    tables.some((table) => table.type === type),
  );

  return (
    <div className="flex flex-col gap-5">
      <h2 className="text-heading text-fg font-semibold">{t("tableTitle")}</h2>

      {offeredTypes.length > 1 && (
        <div className="flex flex-wrap gap-2">
          <Chip
            selected={typeFilter === null}
            onClick={() => onTypeFilter(null)}
          >
            {t("allTypes")}
          </Chip>
          {offeredTypes.map((type) => (
            <Chip
              key={type}
              selected={typeFilter === type}
              onClick={() => onTypeFilter(type)}
            >
              {TABLE_TYPE_LABELS[type]}
            </Chip>
          ))}
        </div>
      )}

      <ul className="flex flex-col gap-2">
        {tables
          .filter((table) => !typeFilter || table.type === typeFilter)
          .map((table) => {
            const free = availableStarts(
              club,
              date,
              table.id,
              duration,
              occupied,
            );
            const isFree = free.length > 0;
            const nextFree = isFree
              ? null
              : nextFreeStart(club, date, table.id, duration, occupied);
            const selected = value === table.id;

            return (
              <li key={table.id}>
                <button
                  type="button"
                  disabled={!isFree}
                  aria-pressed={selected}
                  onClick={() => onSelect(table.id)}
                  className={cn(
                    "duration-fast flex w-full items-center justify-between gap-4 rounded-md p-4 text-left transition-colors ease-out",
                    "disabled:cursor-not-allowed",
                    selected
                      ? "bg-gold-soft shadow-[inset_0_0_0_1px_var(--color-gold)]"
                      : isFree
                        ? "bg-surface-2 hover:bg-surface-3"
                        : "bg-surface-1",
                  )}
                >
                  <span className="flex flex-col gap-0.5">
                    <span
                      className={cn(
                        "text-body font-medium",
                        isFree ? "text-fg" : "text-fg-3",
                      )}
                    >
                      {t("tableNumber", { number: table.number })} ·{" "}
                      {TABLE_TYPE_LABELS[table.type]}
                    </span>
                    <span className="text-label text-fg-3">
                      {isFree
                        ? t("slotsAvailable", { count: free.length })
                        : nextFree !== null
                          ? t("freeFrom", { time: formatMinutes(nextFree) })
                          : t("busyAllDay")}
                    </span>
                  </span>

                  <span
                    className={cn(
                      "text-body shrink-0 font-semibold tabular-nums",
                      isFree ? "text-fg" : "text-fg-3",
                    )}
                  >
                    {formatMoney(priceFor(table, duration))}
                  </span>
                </button>
              </li>
            );
          })}
      </ul>
    </div>
  );
}

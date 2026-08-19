"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/shared/lib/cn";
import { dateStrip, dayNumber, todayIso } from "../lib/dates";

const WEEKDAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

/**
 * Step 1 — the date. A horizontal strip rather than a calendar: nobody
 * books a billiard table three months out, and a strip is one tap with no
 * dialog to dismiss. Today and tomorrow are named, the rest carry a
 * weekday, so the common choices need no counting.
 */
export function StepWhen({
  value,
  onSelect,
  closedDates,
  hint,
}: {
  value: string | null;
  onSelect: (date: string) => void;
  /** Dates the club is shut — shown, disabled, and labelled why. */
  closedDates: ReadonlySet<string>;
  /** What happens after a date is chosen. The first screen says nothing
      about the rest of the flow, which makes it feel like a dead end. */
  hint?: string;
}) {
  const t = useTranslations("flow");
  const today = todayIso();
  const dates = dateStrip(today);

  return (
    /**
     * `min-w-0` is load-bearing, not tidying.
     *
     * Browsers give `<fieldset>` a UA `min-inline-size: min-content`, so it
     * refuses to shrink below its widest child. The date strip is fourteen
     * 64px buttons — about a thousand pixels — so the fieldset grew to fit
     * them, the strip never became narrower than its content, and
     * `overflow-x-auto` had nothing to scroll. The dates simply ran off the
     * card and across the page. No other element in the codebase behaves this
     * way, which is why it looked like a broken layout rather than a missing
     * property.
     */
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="text-heading text-fg mb-4 font-semibold">
        {t("whenTitle")}
      </legend>

      <ul className="-mx-6 flex snap-x snap-mandatory gap-2 overflow-x-auto px-6 pb-2">
        {dates.map((date, index) => {
          const closed = closedDates.has(date);
          const selected = value === date;
          const weekday =
            WEEKDAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()] ?? "mon";
          const label =
            index === 0
              ? t("today")
              : index === 1
                ? t("tomorrow")
                : t(`weekday.${weekday}`);

          return (
            <li key={date} className="snap-start">
              <button
                type="button"
                disabled={closed}
                aria-pressed={selected}
                onClick={() => onSelect(date)}
                className={cn(
                  "duration-fast flex h-20 w-16 shrink-0 flex-col items-center justify-center gap-0.5 rounded-md transition-colors ease-out",
                  "disabled:cursor-not-allowed disabled:opacity-35",
                  selected
                    ? "bg-gold-soft text-gold shadow-[inset_0_0_0_1px_var(--color-gold)]"
                    : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg",
                )}
              >
                <span className="text-caption">{label}</span>
                <span className="text-heading font-semibold tabular-nums">
                  {dayNumber(date)}
                </span>
                {closed && (
                  <span className="text-caption text-fg-3">{t("closed")}</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {hint && <p className="text-label text-fg-3">{hint}</p>}
    </fieldset>
  );
}

"use client";

import { useTranslations } from "next-intl";
import {
  DURATION_PRESETS,
  availableStarts,
  formatMinutes,
  type Minutes,
  type Occupancy,
} from "@/entities/booking";
import type { Club } from "@/entities/club";
import { cn } from "@/shared/lib/cn";
import { Chip } from "@/shared/ui/chip";
import { minutesNowInKyiv, todayIso } from "../lib/dates";

/**
 * Step 3 — duration, then start time.
 *
 * Duration comes first because it changes which start times exist: choosing
 * a time and then being told it no longer fits is the sort of small betrayal
 * that makes a flow feel hostile. Slots already past are hidden on today's
 * date rather than shown disabled — nobody wants to be told they cannot
 * book 14:00 at 19:00.
 */
export function StepTime({
  club,
  date,
  tableId,
  duration,
  occupied,
  value,
  onDuration,
  onSelect,
}: {
  club: Club;
  date: string;
  tableId: string;
  duration: Minutes;
  occupied: readonly Occupancy[];
  value: Minutes | null;
  onDuration: (duration: Minutes) => void;
  onSelect: (start: Minutes) => void;
}) {
  const t = useTranslations("flow");
  const cutoff = date === todayIso() ? minutesNowInKyiv() : 0;
  const starts = availableStarts(
    club,
    date,
    tableId,
    duration,
    occupied,
  ).filter((start) => start >= cutoff);

  return (
    <div className="flex flex-col gap-6">
      <fieldset>
        <legend className="text-heading text-fg mb-3 font-semibold">
          {t("durationTitle")}
        </legend>
        <div className="flex flex-wrap gap-2">
          {DURATION_PRESETS.map((preset) => (
            <Chip
              key={preset}
              selected={duration === preset}
              onClick={() => onDuration(preset)}
            >
              {t("hours", { count: preset / 60 })}
            </Chip>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-heading text-fg mb-3 font-semibold">
          {t("timeTitle")}
        </legend>

        {starts.length === 0 ? (
          <p className="text-body text-fg-2">{t("noSlotsForDuration")}</p>
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {starts.map((start) => {
              const selected = value === start;
              return (
                <button
                  key={start}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(start)}
                  className={cn(
                    "duration-fast text-body h-11 rounded-sm text-center tabular-nums transition-colors ease-out active:scale-[0.98]",
                    selected
                      ? "bg-gold-soft text-gold shadow-[inset_0_0_0_1px_var(--color-gold)]"
                      : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg",
                  )}
                >
                  {formatMinutes(start)}
                </button>
              );
            })}
          </div>
        )}
      </fieldset>
    </div>
  );
}

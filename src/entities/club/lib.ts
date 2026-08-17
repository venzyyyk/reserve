import { uah, type Money } from "@/shared/lib/money";
import type { Club } from "./model";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
type DayKey = (typeof DAY_KEYS)[number];

function toMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** Wall-clock parts of `date` in the club's timezone (Ukraine-wide). */
function kyivParts(date: Date): { day: DayKey; minutes: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Kyiv",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((p) => [p.type, p.value]),
  );
  const day = (parts.weekday ?? "Mon").toLowerCase().slice(0, 3) as DayKey;
  return {
    day,
    minutes: Number(parts.hour ?? 0) * 60 + Number(parts.minute ?? 0),
  };
}

function previousDay(day: DayKey): DayKey {
  const index = DAY_KEYS.indexOf(day);
  return DAY_KEYS[(index + 6) % 7] as DayKey;
}

export type OpenState =
  | { state: "open"; closesAt: string }
  | { state: "closing_soon"; closesAt: string }
  | { state: "closed"; opensAt: string | null };

const CLOSING_SOON_MINUTES = 60;

/**
 * Open/closed with cross-midnight support ("14:00"–"02:00"): a club whose
 * close < open is open past midnight, attributed to the *previous* day's
 * schedule (MPS §6: live status).
 */
export function openStatus(club: Club, now: Date = new Date()): OpenState {
  const { day, minutes } = kyivParts(now);

  const today = club.hours[day];
  if (today) {
    const open = toMinutes(today.open);
    const close = toMinutes(today.close);
    const closesToday = close > open;
    const withinToday = closesToday
      ? minutes >= open && minutes < close
      : minutes >= open;
    if (withinToday) {
      const minutesLeft = closesToday
        ? close - minutes
        : 24 * 60 - minutes + close;
      return minutesLeft <= CLOSING_SOON_MINUTES
        ? { state: "closing_soon", closesAt: today.close }
        : { state: "open", closesAt: today.close };
    }
  }

  // Early morning inside yesterday's cross-midnight window.
  const yesterday = club.hours[previousDay(day)];
  if (yesterday && toMinutes(yesterday.close) <= toMinutes(yesterday.open)) {
    if (minutes < toMinutes(yesterday.close)) {
      const minutesLeft = toMinutes(yesterday.close) - minutes;
      return minutesLeft <= CLOSING_SOON_MINUTES
        ? { state: "closing_soon", closesAt: yesterday.close }
        : { state: "open", closesAt: yesterday.close };
    }
  }

  return {
    state: "closed",
    opensAt: today && minutes < toMinutes(today.open) ? today.open : null,
  };
}

/** Cheapest hourly rate across table groups. */
export function priceFrom(club: Club): Money {
  const min = Math.min(...club.tables.map((t) => t.pricePerHourFrom));
  return uah(min);
}

export function totalTables(club: Club): number {
  return club.tables.reduce((sum, group) => sum + group.count, 0);
}

/** Monday-first week, as Ukrainian schedules are always written. */
export const WEEK_ORDER = [
  "mon",
  "tue",
  "wed",
  "thu",
  "fri",
  "sat",
  "sun",
] as const;
export type WeekDay = (typeof WEEK_ORDER)[number];

/** Today's weekday key in Kyiv — used to highlight the current row. */
export function todayInKyiv(now: Date = new Date()): WeekDay {
  return kyivParts(now).day as WeekDay;
}

/**
 * Collapses identical consecutive days into ranges ("Пн–Чт 12:00–02:00"),
 * the way a person would read a schedule aloud rather than a seven-row table.
 */
export function groupedHours(
  club: Club,
): { days: WeekDay[]; open: string; close: string }[] {
  const groups: { days: WeekDay[]; open: string; close: string }[] = [];
  let previousDayIndex = -2; // never adjacent to index 0

  WEEK_ORDER.forEach((day, index) => {
    const hours = club.hours[day];
    if (!hours) return;

    const last = groups.at(-1);
    // A closed day breaks the range: "Пн, Ср" must never render as "Пн–Ср".
    const contiguous = index === previousDayIndex + 1;
    if (
      last &&
      contiguous &&
      last.open === hours.open &&
      last.close === hours.close
    ) {
      last.days.push(day);
    } else {
      groups.push({ days: [day], open: hours.open, close: hours.close });
    }
    previousDayIndex = index;
  });

  return groups;
}

/** True when the club keeps the same hours every day of the week. */
export function isEveryDaySameHours(club: Club): boolean {
  const groups = groupedHours(club);
  return groups.length === 1 && groups[0]?.days.length === 7;
}

/** Google Maps directions target: precise coordinates when we have them. */
export function directionsUrl(club: Club): string {
  const { coords, street } = club.address;
  const destination = coords
    ? `${coords.lat},${coords.lng}`
    : `${club.name} ${street}`;
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}`;
}

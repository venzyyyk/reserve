import type { Club, WeekDay } from "@/entities/club";
import { WEEK_ORDER } from "@/entities/club";
import { uah, type Money } from "@/shared/lib/money";
import {
  SLOT_MINUTES,
  type IsoDate,
  type Minutes,
  type Occupancy,
  type Table,
  type TimeRange,
} from "./model";

function toMinutes(time: string): Minutes {
  const [h = 0, m = 0] = time.split(":").map(Number);
  return h * 60 + m;
}

/** "1350" → "22:30"; minutes past midnight wrap ("1500" → "01:00"). */
export function formatMinutes(minutes: Minutes): string {
  const normalised = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(normalised / 60);
  const m = normalised % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function weekDayOf(date: IsoDate): WeekDay {
  // Parsed as UTC to avoid the runtime's timezone shifting the date.
  const index = new Date(`${date}T00:00:00Z`).getUTCDay();
  // getUTCDay: 0 = Sunday; WEEK_ORDER is Monday-first.
  return WEEK_ORDER[(index + 6) % 7] as WeekDay;
}

/**
 * Individual tables derived from the club's inventory groups. Numbering runs
 * across the whole club (1…n) in group order, which is how staff refer to
 * them; ids stay stable so a link to a table survives a content rebuild.
 */
export function clubTables(club: Club): Table[] {
  const tables: Table[] = [];
  let number = 0;
  for (const group of club.tables) {
    for (let i = 0; i < group.count; i += 1) {
      number += 1;
      tables.push({
        id: `${group.type}-${number}`,
        type: group.type,
        number,
        pricePerHour: group.pricePerHourFrom,
        ...(group.sizeFt !== undefined && { sizeFt: group.sizeFt }),
        ...(group.brand !== undefined && { brand: group.brand }),
      });
    }
  }
  return tables;
}

export function tableById(club: Club, tableId: string): Table | undefined {
  return clubTables(club).find((table) => table.id === tableId);
}

/**
 * Bookable window for a date. Cross-midnight closes are expressed as minutes
 * past 1440 ("02:00" → 1560) so every comparison stays simple arithmetic.
 */
export function openWindow(club: Club, date: IsoDate): TimeRange | null {
  const hours = club.hours[weekDayOf(date)];
  if (!hours) return null;
  const start = toMinutes(hours.open);
  const rawEnd = toMinutes(hours.close);
  return { start, end: rawEnd > start ? rawEnd : rawEnd + 1440 };
}

/** Every slot start the club could sell on this date. */
export function slotStarts(club: Club, date: IsoDate): Minutes[] {
  const window = openWindow(club, date);
  if (!window) return [];
  const starts: Minutes[] = [];
  for (
    let m = window.start;
    m + SLOT_MINUTES <= window.end;
    m += SLOT_MINUTES
  ) {
    starts.push(m);
  }
  return starts;
}

export function overlaps(a: TimeRange, b: TimeRange): boolean {
  return a.start < b.end && b.start < a.end;
}

/**
 * Can this exact range be sold on this table? Checks the club's window and
 * every existing booking or hold. The server repeats this check inside the
 * hold transaction — the client copy exists to keep the UI honest, never to
 * authorise anything.
 */
export function isRangeFree(
  club: Club,
  date: IsoDate,
  tableId: string,
  range: TimeRange,
  occupied: readonly Occupancy[],
): boolean {
  const window = openWindow(club, date);
  if (!window) return false;
  if (range.start < window.start || range.end > window.end) return false;
  return !occupied.some(
    (busy) =>
      busy.tableId === tableId && busy.date === date && overlaps(range, busy),
  );
}

/** Slot starts on which a booking of `duration` would fit on this table. */
export function availableStarts(
  club: Club,
  date: IsoDate,
  tableId: string,
  duration: Minutes,
  occupied: readonly Occupancy[],
): Minutes[] {
  return slotStarts(club, date).filter((start) =>
    isRangeFree(
      club,
      date,
      tableId,
      { start, end: start + duration },
      occupied,
    ),
  );
}

/** The next moment this table frees up, for "вільний з 21:30" hints. */
export function nextFreeStart(
  club: Club,
  date: IsoDate,
  tableId: string,
  duration: Minutes,
  occupied: readonly Occupancy[],
  after: Minutes = 0,
): Minutes | null {
  return (
    availableStarts(club, date, tableId, duration, occupied).find(
      (start) => start >= after,
    ) ?? null
  );
}

/**
 * Price for a range. Charged per started half-hour: the club's rate is
 * hourly, and billing a 90-minute session as two hours would be the kind of
 * quiet overcharge that loses trust.
 */
export function priceFor(table: Table, duration: Minutes): Money {
  const halfHours = Math.ceil(duration / SLOT_MINUTES);
  return uah(Math.round((table.pricePerHour / 2) * halfHours));
}

/**
 * Free-cancellation deadline: two hours before start, expressed as wall
 * clock so the UI can state it plainly ("Безкоштовне скасування до 17:00").
 */
export const FREE_CANCELLATION_LEAD_MINUTES = 120;

export function cancellationDeadline(start: Minutes): Minutes {
  return start - FREE_CANCELLATION_LEAD_MINUTES;
}

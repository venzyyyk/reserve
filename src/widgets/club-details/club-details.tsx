import {
  Accessibility,
  Beer,
  Car,
  Crown,
  Snowflake,
  Target,
  UtensilsCrossed,
  Wifi,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  AMENITY_LABELS,
  WEEK_ORDER,
  groupedHours,
  isEveryDaySameHours,
  type Amenity,
  type Club,
  type WeekDay,
} from "@/entities/club";
import { cn } from "@/shared/lib/cn";

const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  bar: Beer,
  kitchen: UtensilsCrossed,
  parking: Car,
  wifi: Wifi,
  ac: Snowflake,
  vip_rooms: Crown,
  cue_rental: Target,
  accessible: Accessibility,
};

/**
 * About, amenities and opening hours.
 *
 * Amenities show only what the club *has* — a greyed-out list of absences
 * reads as a list of complaints. Hours collapse identical days into ranges
 * ("Пн–Чт 12:00–02:00") because that is how a person reads a schedule, with
 * today emphasised so the common question is answered without parsing.
 */
export function ClubDetails({
  club,
  today,
}: {
  club: Club;
  /** Resolved by the page so this stays a server component. */
  today: WeekDay;
}) {
  const t = useTranslations("club");
  const groups = groupedHours(club);
  const everyDay = isEveryDaySameHours(club);

  return (
    <div className="flex flex-col gap-12">
      {club.about.length > 0 && (
        <section
          aria-labelledby="about-heading"
          className="flex flex-col gap-4"
        >
          <h2
            id="about-heading"
            className="font-display text-title text-fg scroll-mt-24"
          >
            {t("aboutHeading")}
          </h2>
          <div className="flex max-w-prose flex-col gap-3">
            {club.about.map((paragraph) => (
              <p key={paragraph} className="text-body text-fg-2">
                {paragraph}
              </p>
            ))}
          </div>
        </section>
      )}

      <section
        aria-labelledby="amenities-heading"
        className="flex flex-col gap-4"
      >
        <h2
          id="amenities-heading"
          className="font-display text-title text-fg scroll-mt-24"
        >
          {t("amenitiesHeading")}
        </h2>
        <ul className="flex flex-wrap gap-2">
          {club.amenities.map((amenity) => {
            const Icon = AMENITY_ICONS[amenity];
            return (
              <li
                key={amenity}
                className="bg-surface-2 text-label text-fg-2 inline-flex items-center gap-2 rounded-full px-4 py-2"
              >
                <Icon aria-hidden size={16} className="text-fg-3" />
                {AMENITY_LABELS[amenity]}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="hours-heading" className="flex flex-col gap-4">
        <h2
          id="hours-heading"
          className="font-display text-title text-fg scroll-mt-24"
        >
          {t("hoursHeading")}
        </h2>

        {everyDay ? (
          <p className="text-body text-fg">
            {t("everyDay", {
              open: groups[0]?.open ?? "",
              close: groups[0]?.close ?? "",
            })}
          </p>
        ) : (
          <dl className="flex max-w-md flex-col">
            {groups.map((group) => {
              const includesToday = group.days.includes(today);
              return (
                <div
                  key={group.days.join("-")}
                  className={cn(
                    "border-line flex items-center justify-between gap-6 border-b py-3 last:border-b-0",
                    includesToday && "text-fg",
                  )}
                >
                  <dt
                    className={cn(
                      "text-body",
                      includesToday ? "text-fg font-medium" : "text-fg-2",
                    )}
                  >
                    {group.days.length === 1
                      ? t(`day.${group.days[0] as WeekDay}`)
                      : t("dayRange", {
                          from: t(`dayShort.${group.days[0] as WeekDay}`),
                          to: t(
                            `dayShort.${group.days[group.days.length - 1] as WeekDay}`,
                          ),
                        })}
                    {includesToday && (
                      <span className="text-gold text-label ml-2 font-normal">
                        {t("todayLabel")}
                      </span>
                    )}
                  </dt>
                  <dd
                    className={cn(
                      "text-body tabular-nums",
                      includesToday ? "text-fg font-medium" : "text-fg-2",
                    )}
                  >
                    {group.open}–{group.close}
                  </dd>
                </div>
              );
            })}
            {WEEK_ORDER.filter((day) => !club.hours[day]).map((day) => (
              <div
                key={day}
                className="border-line flex items-center justify-between gap-6 border-b py-3 last:border-b-0"
              >
                <dt className="text-body text-fg-3">{t(`day.${day}`)}</dt>
                <dd className="text-body text-fg-3">{t("closedDay")}</dd>
              </div>
            ))}
          </dl>
        )}
      </section>
    </div>
  );
}

import { Car, Footprints, Navigation, TrainFront } from "lucide-react";
import { useTranslations } from "next-intl";
import { directionsUrl, type Club } from "@/entities/club";
import { Card } from "@/shared/ui/card";

/**
 * Location block. Deliberately not an embedded map: a third-party map iframe
 * costs hundreds of kilobytes and a consent prompt to show what these three
 * lines already answer — where it is, how to arrive, where to park. The
 * "Прокласти маршрут" action hands off to the map app the person already
 * uses. An interactive map earns its place only if we learn people need to
 * see the surroundings before choosing.
 */
export function ClubLocation({ club }: { club: Club }) {
  const t = useTranslations("club");
  const { metro, parking, street, district } = club.address;

  return (
    <section aria-labelledby="location-heading" className="flex flex-col gap-4">
      <h2
        id="location-heading"
        className="font-display text-title text-fg scroll-mt-24"
      >
        {t("locationHeading")}
      </h2>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-start gap-3">
          <Footprints aria-hidden size={18} className="text-fg-3 mt-0.5" />
          <p className="text-body text-fg">
            {street}
            <span className="text-fg-2"> · {district}</span>
          </p>
        </div>

        {metro && (
          <div className="flex items-start gap-3">
            <TrainFront aria-hidden size={18} className="text-fg-3 mt-0.5" />
            <p className="text-body text-fg-2">
              {t("metroWalk", {
                minutes: metro.walkMinutes,
                metro: metro.name,
              })}
            </p>
          </div>
        )}

        {parking && (
          <div className="flex items-start gap-3">
            <Car aria-hidden size={18} className="text-fg-3 mt-0.5" />
            <p className="text-body text-fg-2">{parking}</p>
          </div>
        )}

        <a
          href={directionsUrl(club)}
          target="_blank"
          rel="noreferrer noopener"
          className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast mt-1 inline-flex h-11 w-fit items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
        >
          <Navigation aria-hidden size={16} />
          {t("directions")}
        </a>
      </Card>
    </section>
  );
}

import { CalendarCheck, LineChart, PhoneOff, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Section } from "@/shared/ui/section";
import { Reveal } from "@/shared/ui/motion/reveal";

const POINTS: { id: string; icon: LucideIcon }[] = [
  { id: "calls", icon: PhoneOff },
  { id: "noshow", icon: Wallet },
  { id: "deadHours", icon: CalendarCheck },
  { id: "numbers", icon: LineChart },
];

/**
 * Four objections a club owner actually has, answered in their language:
 * the phone never stops ringing, people book and vanish, weekday afternoons
 * are empty, and nobody knows which table earns.
 */
export function ForClubsValue() {
  const t = useTranslations("forClubs.value");

  return (
    <Section aria-labelledby="value-heading">
      <h2
        id="value-heading"
        className="font-display text-title text-fg md:text-display mb-10 max-w-2xl text-balance"
      >
        {t("title")}
      </h2>

      <ul className="grid gap-x-10 gap-y-8 sm:grid-cols-2">
        {POINTS.map((point, index) => {
          const Icon = point.icon;
          return (
            <li key={point.id}>
              <Reveal delay={index * 80}>
                <div className="flex gap-4">
                  <span
                    aria-hidden
                    className="bg-surface-2 text-gold grid size-11 shrink-0 place-items-center rounded-full"
                  >
                    <Icon size={20} strokeWidth={1.75} />
                  </span>
                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-heading text-fg font-semibold">
                      {t(`${point.id}.title`)}
                    </h3>
                    <p className="text-body text-fg-2 max-w-sm">
                      {t(`${point.id}.body`)}
                    </p>
                  </div>
                </div>
              </Reveal>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

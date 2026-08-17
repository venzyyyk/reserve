import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Section } from "@/shared/ui/section";

const KEYS = [
  "commission",
  "contract",
  "equipment",
  "cancel",
  "payouts",
  "existingSystem",
] as const;

/**
 * Same native <details> pattern as the consumer FAQ — keyboard, screen
 * reader and find-in-page for free, no JavaScript. Money questions first:
 * a club owner wants to know what it costs before what it does.
 */
export function ForClubsFaq() {
  const t = useTranslations("forClubs.faq");

  return (
    <Section aria-labelledby="clubs-faq-heading" className="max-w-[860px]">
      <h2
        id="clubs-faq-heading"
        className="font-display text-title text-fg md:text-display mb-8"
      >
        {t("title")}
      </h2>

      <div className="flex flex-col">
        {KEYS.map((key) => (
          <details key={key} className="group border-line border-b">
            <summary className="text-body text-fg hover:text-gold duration-fast flex cursor-pointer list-none items-center justify-between gap-4 py-5 font-medium transition-colors ease-out [&::-webkit-details-marker]:hidden">
              {t(`${key}.q`)}
              <Plus
                aria-hidden
                size={18}
                className="text-fg-3 duration-base shrink-0 transition-transform ease-out group-open:rotate-45"
              />
            </summary>
            <p className="text-body text-fg-2 max-w-prose pb-5">
              {t(`${key}.a`)}
            </p>
          </details>
        ))}
      </div>
    </Section>
  );
}

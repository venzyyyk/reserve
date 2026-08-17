import { Plus } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/section";

const QUESTION_KEYS = [
  "refund",
  "payment",
  "arrive",
  "cancel",
  "clubs",
  "account",
] as const;

/**
 * FAQ built on native <details>/<summary>: keyboard, screen-reader and
 * find-in-page support for free, zero JS shipped. Refund policy is first —
 * it is the top pre-payment objection (MPS §6).
 */
export async function Faq() {
  const t = await getTranslations("home.faq");

  return (
    <Section aria-labelledby="faq-heading" className="max-w-[860px]">
      <h2
        id="faq-heading"
        className="font-display text-title text-fg md:text-display mb-8"
      >
        {t("title")}
      </h2>
      <div className="flex flex-col">
        {QUESTION_KEYS.map((key) => (
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

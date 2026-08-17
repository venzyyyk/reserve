import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/section";
import { Reveal } from "@/shared/ui/motion/reveal";

/**
 * "Проти дзвінків" (MPS §6 §3): removes the objection "чому не подзвонити?"
 * by contrasting the old flow with three steps. Asymmetric two-column
 * layout — deliberately not a card grid, per the rhythm rule.
 */
export async function HowItWorks() {
  const t = await getTranslations("home.how");
  const steps = ["step1", "step2", "step3"] as const;

  return (
    <Section aria-labelledby="how-heading" className="md:py-32">
      <div className="grid gap-12 md:grid-cols-[0.9fr_1.1fr] md:gap-16">
        <div className="flex flex-col gap-4">
          <h2
            id="how-heading"
            className="font-display text-title text-fg md:text-display"
          >
            {t("title")}
          </h2>
          <p className="text-body text-fg-2 max-w-sm text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <ol className="flex flex-col">
          {steps.map((step, index) => (
            <li key={step}>
              <Reveal delay={index * 80}>
                <div className="border-line flex gap-5 border-t py-6">
                  <span
                    aria-hidden
                    className="text-gold font-display text-heading w-8 shrink-0 tabular-nums"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="flex flex-col gap-1">
                    <h3 className="text-heading text-fg font-semibold">
                      {t(`${step}.title`)}
                    </h3>
                    <p className="text-body text-fg-2">{t(`${step}.body`)}</p>
                  </div>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </Section>
  );
}

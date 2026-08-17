import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Section } from "@/shared/ui/section";

/**
 * Closing CTA (MPS §6 §10). One gold action on the page ends here; the
 * cancellation microcopy sits directly under it because that is the last
 * unspoken hesitation before a first booking.
 */
export async function FinalCta() {
  const t = await getTranslations("home.finalCta");

  return (
    <Section className="pb-24 md:pb-32">
      <div
        className="relative isolate overflow-hidden rounded-xl px-6 py-16 text-center md:px-16 md:py-24"
        style={{
          background:
            "radial-gradient(80% 120% at 50% 0%, rgb(46 125 50 / 0.22), transparent 65%), var(--color-surface-1)",
        }}
      >
        <h2 className="font-display text-title text-fg md:text-display">
          {t("title")}
        </h2>
        <p className="text-body text-fg-2 mx-auto mt-3 max-w-md text-pretty">
          {t("subtitle")}
        </p>
        <Link
          href="/clubs"
          className="bg-gold text-bg hover:bg-gold-hover duration-fast mt-8 inline-flex h-14 items-center rounded-full px-8 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
        >
          {t("cta")}
        </Link>
        <p className="text-label text-fg-3 mt-4">{t("microcopy")}</p>
      </div>
    </Section>
  );
}

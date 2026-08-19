import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useTranslations } from "next-intl";

/**
 * The club owner's first five seconds. They are not a consumer browsing —
 * they are deciding whether this costs them money or makes them money, so
 * the headline answers that and the stats prove there is demand to capture.
 */
export function ForClubsHero({
  stats,
}: {
  stats: readonly { value: string; label: string }[];
}) {
  const t = useTranslations("forClubs.hero");

  return (
    <section className="relative isolate overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(110% 80% at 20% -10%, rgb(200 155 60 / 0.20), transparent 60%), radial-gradient(70% 50% at 85% 10%, rgb(46 125 50 / 0.18), transparent 70%), var(--color-bg)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-bg))",
        }}
      />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 pt-28 pb-16 md:pt-36 md:pb-24">
        <div className="flex max-w-2xl flex-col gap-5">
          <p className="text-label text-gold font-medium">{t("eyebrow")}</p>
          <h1 className="font-display text-display text-fg md:text-display-xl text-balance">
            {t("title")}
          </h1>
          <p className="text-body text-fg-2 max-w-lg text-pretty">
            {t("subtitle")}
          </p>

          <div className="mt-2 flex flex-wrap gap-3">
            <Link
              href="/for-clubs/apply"
              className="bg-gold text-bg hover:bg-gold-hover duration-fast inline-flex h-14 items-center gap-2 rounded-full px-8 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
            >
              {t("primaryCta")}
              <ArrowRight aria-hidden size={18} />
            </Link>
            <a
              href="#pricing"
              className="bg-surface-2 text-fg hover:bg-surface-3 duration-fast inline-flex h-14 items-center rounded-full px-8 font-medium transition-colors ease-out active:scale-[0.98]"
            >
              {t("secondaryCta")}
            </a>
          </div>
        </div>

        <dl
          hidden={stats.length === 0}
          className="flex flex-wrap gap-x-12 gap-y-4"
        >
          {stats.map((stat) => (
            <div key={stat.label} className="flex flex-col">
              <dt className="sr-only">{stat.label}</dt>
              <dd className="font-display text-title text-fg tabular-nums">
                {stat.value}
              </dd>
              <p aria-hidden className="text-label text-fg-3">
                {stat.label}
              </p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

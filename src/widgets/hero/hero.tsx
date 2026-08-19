import { getTranslations } from "next-intl/server";
// Leaf import, not the feature barrel: barrels re-export the catalog filters,
// which would pull the URL-state runtime into the homepage bundle (ADR-0006).
import { QuickSearchForm } from "@/features/club-search/components/quick-search-form";

interface HeroStat {
  value: string;
  label: string;
}

/**
 * Homepage hero (MPS §6). Text and the search widget are server-rendered so
 * the LCP element is HTML, not hydration-dependent. The cinematic layer is
 * pure CSS (felt gradient + lamp pool + vignette) — ADR-0005: no video at
 * M1a, because a 1.5 MB loop cannot coexist with the Lighthouse 95 gate
 * until we have real venue footage worth the bytes.
 */
export async function Hero({ stats }: { stats: readonly HeroStat[] }) {
  const t = await getTranslations("home.hero");

  return (
    <section className="relative isolate overflow-hidden">
      {/* Two light pools that drift on a half-minute cycle. Compositor-only
          (`transform`/`opacity`), no JavaScript, and still when the visitor
          has asked for less motion — see `.ambient` in globals.css. */}
      <div aria-hidden className="bg-bg absolute inset-0 -z-10" />
      <div aria-hidden className="ambient">
        <div className="ambient-felt" />
        <div className="ambient-lamp" />
      </div>
      <div
        aria-hidden
        className="absolute inset-x-0 bottom-0 -z-10 h-40"
        style={{
          background:
            "linear-gradient(to bottom, transparent, var(--color-bg))",
        }}
      />

      <div className="mx-auto flex max-w-[1200px] flex-col gap-10 px-6 pt-28 pb-16 md:pt-40 md:pb-24">
        <div className="flex max-w-2xl flex-col gap-5">
          <h1 className="font-display text-display text-fg md:text-display-xl text-balance">
            {t("title")}
          </h1>
          <p className="text-body text-fg-2 max-w-md text-pretty">
            {t("subtitle")}
          </p>
        </div>

        <div className="max-w-3xl">
          <QuickSearchForm />
        </div>

        {/* A counter at zero is worse than no counter: "0 клубів" under a
            headline promising a booking in thirty seconds reads as a broken
            site, and it is the first thing a club owner sees when we pitch
            them. Nothing to count, nothing to show. */}
        <dl
          hidden={stats.length === 0}
          className="flex flex-wrap gap-x-10 gap-y-4"
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

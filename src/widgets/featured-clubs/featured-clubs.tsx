import { ArrowRight, Building2 } from "lucide-react";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import type { Club } from "@/entities/club";
import { EmptyState } from "@/shared/ui/empty-state";
import { Section } from "@/shared/ui/section";
import { Reveal } from "@/shared/ui/motion/reveal";
import { ClubCard } from "@/widgets/club-card";

/**
 * Editorial club row. Reused verbatim by city pages ("Клуби у Києві") and,
 * from M6, by recommendations — hence title/href/emptiness are all props.
 */
export async function FeaturedClubs({
  clubs,
  title,
  href = "/clubs",
}: {
  clubs: readonly Club[];
  title: string;
  href?: string;
}) {
  const t = await getTranslations("home.featured");

  return (
    <Section aria-labelledby="featured-heading">
      <div className="mb-8 flex items-end justify-between gap-4">
        <h2
          id="featured-heading"
          className="font-display text-title text-fg md:text-display"
        >
          {title}
        </h2>
        <Link
          href={href}
          className="text-label text-fg-2 hover:text-fg duration-fast inline-flex shrink-0 items-center gap-1.5 rounded-full transition-colors ease-out"
        >
          {t("all")}
          <ArrowRight aria-hidden size={16} />
        </Link>
      </div>

      {clubs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title={t("emptyTitle")}
          description={t("emptyBody")}
          action={
            <Link
              href="/clubs"
              className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out"
            >
              {t("all")}
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {clubs.map((club, index) => (
            <li key={club.id}>
              <Reveal delay={index * 80}>
                <ClubCard club={club} />
              </Reveal>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

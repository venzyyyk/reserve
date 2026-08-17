import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { CITIES } from "@/entities/city";

/**
 * Premium footer (MPS §6): city links for SEO depth, the B2B door for club
 * owners, and legal surface. Payment-method logos land with M2a, when the
 * claim becomes true.
 */
export async function SiteFooter() {
  const t = await getTranslations("footer");

  return (
    <footer className="border-line mt-auto border-t">
      <div className="mx-auto grid max-w-[1200px] gap-10 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <p className="font-display text-fg text-lg">Reserve</p>
          <p className="text-label text-fg-3 max-w-[24ch]">{t("tagline")}</p>
        </div>

        <nav aria-labelledby="footer-cities" className="flex flex-col gap-3">
          <h2 id="footer-cities" className="text-label text-fg font-medium">
            {t("cities")}
          </h2>
          <ul className="flex flex-col gap-2">
            {CITIES.map((city) => (
              <li key={city.slug}>
                <Link
                  href={`/clubs/${city.slug}`}
                  className="text-label text-fg-2 hover:text-fg duration-fast rounded-sm transition-colors ease-out"
                >
                  {t("clubsIn", { city: city.locative })}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-product" className="flex flex-col gap-3">
          <h2 id="footer-product" className="text-label text-fg font-medium">
            {t("product")}
          </h2>
          <ul className="flex flex-col gap-2">
            <li>
              <Link
                href="/clubs"
                className="text-label text-fg-2 hover:text-fg duration-fast rounded-sm transition-colors ease-out"
              >
                {t("catalog")}
              </Link>
            </li>
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <h2 className="text-label text-fg font-medium">{t("forClubs")}</h2>
          <p className="text-label text-fg-3">{t("forClubsBody")}</p>
          <Link
            href="/for-clubs"
            className="text-label text-gold hover:text-gold-hover duration-fast w-fit rounded-sm transition-colors ease-out"
          >
            {t("forClubsLink")}
          </Link>
          <a
            href="mailto:clubs@reserve.ua"
            className="text-label text-fg-3 hover:text-fg duration-fast w-fit rounded-sm transition-colors ease-out"
          >
            clubs@reserve.ua
          </a>
        </div>
      </div>

      <div className="border-line mx-auto max-w-[1200px] border-t px-6 py-6">
        <p className="text-caption text-fg-3">
          {t("copyright", { year: 2026 })}
        </p>
      </div>
    </footer>
  );
}

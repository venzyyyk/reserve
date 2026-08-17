import Link from "next/link";
import { getTranslations } from "next-intl/server";

/** Glass header (MPS §2). Hidden nav items stay hidden until their
 *  milestone ships — the tab-bar rule applies to the header too. */
export async function SiteHeader() {
  const t = await getTranslations("nav");
  return (
    <header className="border-line bg-surface-1/70 fixed inset-x-0 top-0 z-40 border-b backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        <Link href="/" className="font-display text-fg text-lg tracking-tight">
          Reserve
        </Link>
        <nav
          aria-label={t("main")}
          className="hidden items-center gap-2 sm:flex"
        >
          <Link
            href="/clubs"
            className="text-label text-fg-2 hover:bg-surface-2 hover:text-fg duration-fast rounded-full px-4 py-2 font-medium transition-colors ease-out"
          >
            {t("clubs")}
          </Link>
          <Link
            href="/my"
            className="text-label text-fg-2 hover:bg-surface-2 hover:text-fg duration-fast rounded-full px-4 py-2 font-medium transition-colors ease-out"
          >
            {t("my")}
          </Link>
          <Link
            href="/for-clubs"
            className="text-label text-fg-2 hover:bg-surface-2 hover:text-fg duration-fast rounded-full px-4 py-2 font-medium transition-colors ease-out"
          >
            {t("forClubs")}
          </Link>
          <Link
            href="/clubs"
            className="bg-gold text-bg hover:bg-gold-hover text-label duration-fast ml-2 inline-flex h-9 items-center rounded-full px-5 font-medium transition-colors ease-out"
          >
            {t("book")}
          </Link>
        </nav>
      </div>
    </header>
  );
}

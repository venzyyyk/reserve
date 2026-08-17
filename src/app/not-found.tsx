import Link from "next/link";
import { getTranslations } from "next-intl/server";

export default async function NotFound() {
  const t = await getTranslations("errors");
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <p aria-hidden className="font-display text-display-xl text-fg-3">
          404
        </p>
        <h1 className="text-title text-fg font-semibold">
          {t("notFoundTitle")}
        </h1>
        <p className="text-body text-fg-2">{t("notFoundBody")}</p>
        <Link
          href="/"
          className="bg-surface-2 text-body text-fg shadow-elev-1 duration-fast hover:bg-surface-3 inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out"
        >
          {t("home")}
        </Link>
      </div>
    </main>
  );
}

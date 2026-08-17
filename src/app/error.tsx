"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Button } from "@/shared/ui/button";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    // Reported to Sentry via instrumentation when configured.
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="flex max-w-md flex-col items-center gap-4 text-center">
        <h1 className="text-title text-fg font-semibold">{t("serverTitle")}</h1>
        <p className="text-body text-fg-2">{t("serverBody")}</p>
        <Button variant="primary" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </main>
  );
}

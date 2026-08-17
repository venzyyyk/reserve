"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { openStatus, type Club, type OpenState } from "@/entities/club";
import { Badge } from "@/shared/ui/badge";

/**
 * Live open/closed status. Client-only by design: catalog and city pages are
 * ISR-static, so a server-rendered status would freeze at build time. Until
 * mounted we render a layout-stable placeholder (no CLS, no hydration
 * mismatch), then refresh each minute.
 */
export function OpenStatusBadge({ club }: { club: Club }) {
  const t = useTranslations("status");
  const [status, setStatus] = useState<OpenState | null>(null);

  useEffect(() => {
    const update = () => setStatus(openStatus(club));
    update();
    const timer = setInterval(update, 60_000);
    return () => clearInterval(timer);
  }, [club]);

  if (!status) {
    return <span aria-hidden className="bg-surface-3 h-5 w-24 rounded-full" />;
  }
  if (status.state === "closed") {
    return (
      <Badge variant="neutral">
        {status.opensAt ? t("opensAt", { time: status.opensAt }) : t("closed")}
      </Badge>
    );
  }
  return (
    <Badge
      variant={status.state === "open" ? "felt" : "gold"}
      live={status.state === "open"}
    >
      {status.state === "open"
        ? t("openUntil", { time: status.closesAt })
        : t("closingAt", { time: status.closesAt })}
    </Badge>
  );
}

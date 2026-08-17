"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";

/**
 * "Стіл тримаємо за вами · 4:32".
 *
 * The countdown exists to reassure, not to rush: it explains why the guest
 * can take their time entering a card. It turns amber under a minute — a
 * change of tone, not a klaxon — and announces itself to screen readers
 * only at meaningful thresholds rather than every second.
 *
 * It counts down from the server's `expiresInMs` using elapsed time, never
 * from an absolute timestamp compared against the device clock: a phone set
 * an hour slow would otherwise show a fresh hold as already expired and
 * throw the guest out of a perfectly valid booking.
 */
export function HoldCountdown({
  expiresInMs,
  onExpire,
}: {
  expiresInMs: number;
  onExpire: () => void;
}) {
  const t = useTranslations("flow");
  const startedAt = useRef(Date.now());
  const [msLeft, setMsLeft] = useState(expiresInMs);

  useEffect(() => {
    startedAt.current = Date.now();
    setMsLeft(expiresInMs);

    const tick = () => {
      // Elapsed time is immune to a wrong clock; only a clock *change*
      // mid-countdown could skew it, and that is rare and self-correcting.
      const left = Math.max(0, expiresInMs - (Date.now() - startedAt.current));
      setMsLeft(left);
      if (left === 0) onExpire();
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresInMs, onExpire]);

  const totalSeconds = Math.ceil(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const urgent = totalSeconds <= 60;
  // Announce at 2:00 and 0:30 only (MPS §3 a11y contract).
  const announce = totalSeconds === 120 || totalSeconds === 30;

  return (
    <p
      className={`text-label flex items-center gap-2 ${urgent ? "text-gold" : "text-fg-3"}`}
    >
      <span
        aria-hidden
        className={`size-1.5 rounded-full ${urgent ? "bg-gold animate-live" : "bg-fg-3"}`}
      />
      {t("holding")}
      <span className="tabular-nums">
        {minutes}:{String(seconds).padStart(2, "0")}
      </span>
      <span aria-live="polite" className="sr-only">
        {announce ? t("holdingLeft", { minutes, seconds }) : ""}
      </span>
    </p>
  );
}

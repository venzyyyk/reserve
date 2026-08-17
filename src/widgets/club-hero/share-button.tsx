"use client";

import { Check, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";

/**
 * Native share on mobile, clipboard everywhere else. The button reports
 * success in place ("Скопійовано") instead of firing a toast — the feedback
 * belongs where the user's attention already is.
 */
export function ShareButton({ title, text }: { title: string; text: string }) {
  const t = useTranslations("club");
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch {
        // Dismissed the sheet, or sharing is unavailable — fall through.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard denied (insecure context): leave the label unchanged
      // rather than claim something happened.
    }
  }

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out active:scale-[0.98]"
    >
      {copied ? (
        <Check aria-hidden size={16} className="text-[#6FBF73]" />
      ) : (
        <Share2 aria-hidden size={16} />
      )}
      <span aria-live="polite">{copied ? t("copied") : t("share")}</span>
    </button>
  );
}

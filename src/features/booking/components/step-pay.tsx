"use client";

import { CreditCard, Smartphone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState, type FormEvent } from "react";
import { cn } from "@/shared/lib/cn";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";

export type PaymentMethod = "card" | "apple_pay" | "google_pay" | "monobank";

/**
 * Step 4 — pay.
 *
 * Wallet methods come first because they are one tap and no typing (MPS §4).
 * The phone number is the only field a guest must fill in the entire flow;
 * verification happens *after* payment, so a code that never arrives cannot
 * cost the club a booking.
 */
export function StepPay({
  total,
  phone,
  onPhone,
  onSubmit,
  pending,
  error,
  walletAvailable,
}: {
  total: string;
  phone: string;
  onPhone: (value: string) => void;
  onSubmit: (method: PaymentMethod, cardNumber?: string) => void;
  pending: boolean;
  error: string | null;
  /** Wallet buttons only appear where the platform can actually pay. */
  walletAvailable: boolean;
}) {
  const t = useTranslations("flow");
  const [method, setMethod] = useState<PaymentMethod>("card");
  const [cardNumber, setCardNumber] = useState("");
  const phoneValid = /^\+380\d{9}$/.test(phone.replace(/\s/g, ""));

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!phoneValid || pending) return;
    onSubmit(method, method === "card" ? cardNumber : undefined);
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <h2 className="text-heading text-fg font-semibold">{t("payTitle")}</h2>

        {walletAvailable && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setMethod("apple_pay")}
              aria-pressed={method === "apple_pay"}
              className={cn(
                "duration-fast text-body flex h-14 items-center justify-center gap-2 rounded-full font-medium transition-colors ease-out",
                method === "apple_pay"
                  ? "bg-fg text-bg"
                  : "bg-surface-2 text-fg hover:bg-surface-3",
              )}
            >
              <Smartphone aria-hidden size={18} />
              {t("applePay")}
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={() => setMethod("card")}
          aria-pressed={method === "card"}
          className={cn(
            "duration-fast text-body flex h-14 items-center justify-center gap-2 rounded-full font-medium transition-colors ease-out",
            method === "card"
              ? "bg-surface-3 text-fg shadow-[inset_0_0_0_1px_var(--color-line-strong)]"
              : "bg-surface-2 text-fg-2 hover:bg-surface-3",
          )}
        >
          <CreditCard aria-hidden size={18} />
          {t("cardMethod")}
        </button>
      </div>

      {method === "card" && (
        <Input
          label={t("cardNumber")}
          inputMode="numeric"
          autoComplete="cc-number"
          placeholder="0000 0000 0000 0000"
          value={cardNumber}
          onChange={(e) => setCardNumber(e.target.value)}
          hint={t("sandboxHint")}
        />
      )}

      <Input
        label={t("phone")}
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        placeholder="+380 44 200 12 34"
        value={phone}
        onChange={(e) => onPhone(e.target.value)}
        hint={t("phoneHint")}
        {...(error ? { error } : {})}
      />

      <Button
        type="submit"
        variant="primary"
        size="lg"
        loading={pending}
        disabled={!phoneValid}
      >
        {t("payNow", { total })}
      </Button>

      <p className="text-caption text-fg-3 text-center">{t("payFooter")}</p>
    </form>
  );
}

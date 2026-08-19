"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  formatMinutes,
  openWindow,
  priceFor,
  tableById,
  type Hold,
} from "@/entities/booking";
import { priceFrom, type Club, type TableType } from "@/entities/club";
import {
  HoldCountdown,
  StepPay,
  StepTable,
  StepTime,
  StepWhen,
  readSelection,
  stepFor,
  useAvailability,
  useCreateHold,
  useStartPayment,
  waitForPayment,
  writeSelection,
  type FlowStep,
  type PaymentMethod,
} from "@/features/booking";
import { dateStrip, todayIso } from "@/features/booking";
import { AppError } from "@/shared/api/errors";
import { cn } from "@/shared/lib/cn";
import { formatMoney } from "@/shared/lib/money";
import { track } from "@/shared/lib/track";
import { Button } from "@/shared/ui/button";
import { Skeleton } from "@/shared/ui/skeleton";

const STEP_ORDER: readonly FlowStep[] = ["when", "table", "time", "pay"];

/**
 * The booking flow.
 *
 * State lives in the URL, so back goes back a step, refresh keeps the
 * selection, and the whole thing survives a phone call mid-booking. The
 * hold is created only when the guest reaches payment — holding a table
 * while someone browses would make the club look full to everyone else.
 */
export function BookingFlow({ club }: { club: Club }) {
  const t = useTranslations("flow");
  const router = useRouter();
  const searchParams = useSearchParams();

  const selection = useMemo(
    () => readSelection(new URLSearchParams(searchParams.toString())),
    [searchParams],
  );
  const step = stepFor(selection);

  const [typeFilter, setTypeFilter] = useState<TableType | null>(null);
  const [hold, setHold] = useState<
    (Hold & { total: number; expiresInMs: number }) | null
  >(null);
  const [phone, setPhone] = useState("");
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const availability = useAvailability(club.id, selection.date);
  const createHold = useCreateHold();
  const startPayment = useStartPayment();

  const update = useCallback(
    (next: Partial<ReturnType<typeof readSelection>>) => {
      const merged = { ...selection, ...next };
      router.replace(`?${writeSelection(merged).toString()}`, {
        scroll: false,
      });
    },
    [router, selection],
  );

  /** Dates the club is closed — disabled in the strip, never silently absent. */
  const closedDates = useMemo(() => {
    const closed = new Set<string>();
    for (const date of dateStrip(todayIso())) {
      if (!openWindow(club, date)) closed.add(date);
    }
    return closed;
  }, [club]);

  const table = selection.tableId
    ? tableById(club, selection.tableId)
    : undefined;
  const total =
    table && selection.start !== null
      ? priceFor(table, selection.duration)
      : null;

  // Reaching payment reserves the table. Leaving the step releases it, so a
  // guest who steps back does not block the slot for the next five minutes.
  useEffect(() => {
    if (step !== "pay" || hold || createHold.isPending) return;
    if (!selection.date || !selection.tableId || selection.start === null)
      return;

    createHold.mutate(
      {
        clubId: club.id,
        tableId: selection.tableId,
        date: selection.date,
        start: selection.start,
        end: selection.start + selection.duration,
      },
      {
        onSuccess: (data) => {
          setHold({
            ...data.hold,
            total: data.total,
            expiresInMs: data.expiresInMs,
          });
          track("booking_step_reached", { step: "payment", clubId: club.id });
        },
        onError: (error: AppError) => {
          if (error.code === "conflict") {
            // Someone was faster. Send them back to the time step with the
            // fresh picture rather than failing at the card form.
            void availability.refetch();
            update({ start: null });
            setPayError(t("slotTaken"));
          } else {
            setPayError(error.uaMessage);
          }
        },
      },
    );
  }, [step, hold, createHold, selection, club.id, availability, update, t]);

  const releaseHold = useCallback(() => {
    if (!hold) return;
    void fetch(`/api/holds?id=${encodeURIComponent(hold.id)}`, {
      method: "DELETE",
      keepalive: true,
    });
    setHold(null);
  }, [hold]);

  function back() {
    abortRef.current?.abort();
    if (step === "pay") {
      releaseHold();
      update({ start: selection.start });
      router.replace(
        `?${writeSelection({ ...selection, start: null }).toString()}`,
        { scroll: false },
      );
      return;
    }
    if (step === "time") return update({ tableId: null, start: null });
    if (step === "table") return update({ date: null, tableId: null });
    router.back();
  }

  async function pay(method: PaymentMethod, cardNumber?: string) {
    if (!hold) return;
    setPayError(null);
    setPaying(true);
    abortRef.current = new AbortController();

    try {
      const started = await startPayment.mutateAsync({
        holdId: hold.id,
        phone: phone.replace(/\s/g, ""),
        method,
        ...(cardNumber && { cardNumber }),
      });
      const settled = await waitForPayment(
        started.paymentId,
        abortRef.current.signal,
      );

      if (settled.status === "succeeded") {
        track("booking_step_reached", { step: "confirmed", clubId: club.id });
        router.push(`/booking/${settled.bookingId}`);
        return;
      }
      setPayError(
        settled.failureReason === "insufficient_funds"
          ? t("payFailedFunds")
          : settled.failureReason === "slot_lost"
            ? t("payRefunded")
            : t("payFailedDeclined"),
      );
    } catch (error) {
      if (error instanceof AppError && error.status === 410) {
        setHold(null);
        setPayError(t("holdExpired"));
      } else if (error instanceof AppError) {
        setPayError(error.uaMessage);
      } else {
        setPayError(t("payFailedGeneric"));
      }
    } finally {
      setPaying(false);
    }
  }

  const summary = [
    selection.date && formatDate(selection.date, t("today"), t("tomorrow")),
    table && t("tableNumber", { number: table.number }),
    selection.start !== null &&
      `${formatMinutes(selection.start)}–${formatMinutes(selection.start + selection.duration)}`,
  ].filter(Boolean) as string[];

  return (
    /* The site header is `fixed` and 64px tall, so `pt-6` put the back button
       and the progress bar underneath it — clipped, and the back button was
       not clickable at all on the steps that need it. Every other page clears
       the header with `pt-28`; this one is tighter because the flow should
       get to the tables quickly, not because the header is smaller here. */
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-6 px-6 pt-24 pb-32 md:pt-28">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={back}
          aria-label={t("back")}
          className="bg-surface-2 text-fg hover:bg-surface-3 duration-fast grid size-11 shrink-0 place-items-center rounded-full transition-colors ease-out"
        >
          <ArrowLeft aria-hidden size={18} />
        </button>
        <ol
          className="flex flex-1 items-center gap-1.5"
          aria-label={t("progress")}
        >
          {STEP_ORDER.map((id) => {
            const index = STEP_ORDER.indexOf(id);
            const current = STEP_ORDER.indexOf(step);
            return (
              <li
                key={id}
                aria-current={id === step ? "step" : undefined}
                className={cn(
                  "duration-base h-1 flex-1 rounded-full transition-colors ease-out",
                  index <= current ? "bg-gold" : "bg-surface-3",
                )}
              >
                <span className="sr-only">{t(`step.${id}`)}</span>
              </li>
            );
          })}
        </ol>
      </div>

      {/* Which club, and what a table costs — on every step.
          Without it the first screen is a row of dates and nothing else:
          the guest has to remember where they are and take the price on
          faith, and on a desktop the page reads as broken. */}
      <div className="border-line flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-b pb-4">
        <p className="text-heading text-fg font-semibold">{club.name}</p>
        <p className="text-label text-fg-2 tabular-nums">
          {t("priceFrom", { price: formatMoney(priceFrom(club)) })}
        </p>
        <p className="text-caption text-fg-3 w-full">{club.address.street}</p>
      </div>

      {summary.length > 0 && step !== "when" && (
        <p className="text-label text-fg-2">{summary.join(" · ")}</p>
      )}

      {step === "when" && (
        <StepWhen
          value={selection.date}
          closedDates={closedDates}
          onSelect={(date) => {
            update({ date, tableId: null, start: null });
            track("booking_step_reached", { step: "where", clubId: club.id });
          }}
          hint={t("whenHint")}
        />
      )}

      {step !== "when" && availability.isPending && (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {step === "table" && availability.data && selection.date && (
        <StepTable
          club={club}
          date={selection.date}
          duration={selection.duration}
          tables={availability.data.tables}
          occupied={availability.data.occupied}
          value={selection.tableId}
          typeFilter={typeFilter}
          onTypeFilter={setTypeFilter}
          onSelect={(tableId) => {
            update({ tableId, start: null });
            track("booking_step_reached", { step: "table", clubId: club.id });
          }}
        />
      )}

      {step === "time" &&
        availability.data &&
        selection.date &&
        selection.tableId && (
          <>
            <StepTime
              club={club}
              date={selection.date}
              tableId={selection.tableId}
              duration={selection.duration}
              occupied={availability.data.occupied}
              value={selection.start}
              onDuration={(duration) => update({ duration, start: null })}
              onSelect={(start) => {
                update({ start });
                track("booking_step_reached", {
                  step: "time",
                  clubId: club.id,
                });
              }}
            />
            {payError && (
              <p role="alert" className="text-body text-gold">
                {payError}
              </p>
            )}
          </>
        )}

      {step === "pay" && (
        <div className="flex flex-col gap-5">
          {hold ? (
            <>
              <HoldCountdown
                expiresInMs={hold.expiresInMs}
                onExpire={() => {
                  setHold(null);
                  setPayError(t("holdExpired"));
                  update({ start: null });
                }}
              />
              <StepPay
                total={formatMoney(
                  total ?? { amount: hold.total, currency: "UAH" },
                )}
                phone={phone}
                onPhone={setPhone}
                onSubmit={(method, cardNumber) => void pay(method, cardNumber)}
                pending={paying}
                error={payError}
                walletAvailable={false}
              />
            </>
          ) : (
            <div className="flex flex-col gap-3">
              <Skeleton className="h-14 w-full" />
              <Skeleton className="h-12 w-full" />
              {payError && (
                <p role="alert" className="text-body text-gold">
                  {payError}
                </p>
              )}
              {!createHold.isPending && payError && (
                <Button
                  variant="secondary"
                  onClick={() => update({ start: null })}
                >
                  {t("chooseAnotherTime")}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatDate(date: string, today: string, tomorrow: string): string {
  const iso = todayIso();
  if (date === iso) return today;
  if (date === dateStrip(iso, 2)[1]) return tomorrow;
  return new Intl.DateTimeFormat("uk-UA", {
    day: "numeric",
    month: "long",
    timeZone: "Europe/Kyiv",
  }).format(new Date(`${date}T12:00:00Z`));
}

import { Check, MapPin, Navigation, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import QRCode from "qrcode";
import { formatMinutes, tableById } from "@/entities/booking";
import { ticketPayload } from "@/entities/booking/qr";
import { bookingRepository } from "@/entities/booking/repository";
import { TABLE_TYPE_LABELS, directionsUrl } from "@/entities/club";
import { clubRepository } from "@/entities/club/repository";
import { canReview } from "@/entities/review";
import { reviewRepository } from "@/entities/review/repository";
import { ReviewForm } from "@/features/review/components/review-form";
import { isReviewOutcome } from "@/features/review/model";
import { formatMoney, uah } from "@/shared/lib/money";
import { Card } from "@/shared/ui/card";
import { submitReview } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * The ticket.
 *
 * Server-rendered, including the QR: it costs no client JavaScript and it
 * means the page works on a dying phone in a basement club. Everything a
 * doorman or a guest needs is on one screen, in the order they need it —
 * code first, then when and where, then the ways to change plans.
 */
export default async function TicketPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const outcome = isReviewOutcome(query.review) ? query.review : undefined;
  const booking = await bookingRepository.byId(id);
  if (!booking || booking.status !== "confirmed") notFound();

  const club = await clubRepository.byId(booking.clubId);
  if (!club) notFound();

  // Only looked up once the session is over — before that there is nothing
  // to show and no reason to touch the store.
  const existingReview = canReview(booking)
    ? await reviewRepository.byBooking(booking.id)
    : undefined;

  const t = await getTranslations("ticket");
  const table = tableById(club, booking.tableId);

  const qr = await QRCode.toString(ticketPayload(booking), {
    type: "svg",
    margin: 0,
    color: { dark: "#0B0B0B", light: "#FFFFFF" },
    errorCorrectionLevel: "M",
  });

  const dateLabel = new Intl.DateTimeFormat("uk-UA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Europe/Kyiv",
  }).format(new Date(`${booking.date}T12:00:00Z`));

  return (
    <main className="mx-auto flex w-full max-w-[520px] flex-col gap-6 px-6 py-10">
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden
          className="bg-felt-soft grid size-12 place-items-center rounded-full"
        >
          <Check size={24} className="text-[#6FBF73]" />
        </span>
        <h1 className="font-display text-title text-fg">{t("confirmed")}</h1>
        <p className="text-body text-fg-2">{t("showAtEntrance")}</p>
      </div>

      <Card className="flex flex-col items-center gap-4 p-6">
        <div
          className="w-full max-w-[240px] rounded-md bg-white p-4 [&>svg]:h-auto [&>svg]:w-full"
          // QR generated server-side by the qrcode package; no user input.
          dangerouslySetInnerHTML={{ __html: qr }}
        />
        <p className="font-display text-title text-fg tracking-widest tabular-nums">
          {booking.reference}
        </p>
      </Card>

      <Card className="flex flex-col gap-4 p-5">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-label text-fg-3">{t("when")}</span>
          <span className="text-body text-fg text-right font-medium">
            {dateLabel}
            <br />
            <span className="tabular-nums">
              {formatMinutes(booking.start)}–{formatMinutes(booking.end)}
            </span>
          </span>
        </div>

        <div className="border-line flex items-baseline justify-between gap-4 border-t pt-4">
          <span className="text-label text-fg-3">{t("table")}</span>
          <span className="text-body text-fg font-medium">
            {table
              ? `${t("tableNumber", { number: table.number })} · ${TABLE_TYPE_LABELS[table.type]}`
              : booking.tableId}
          </span>
        </div>

        <div className="border-line flex items-baseline justify-between gap-4 border-t pt-4">
          <span className="text-label text-fg-3">{t("paid")}</span>
          <span className="text-body text-fg font-semibold tabular-nums">
            {formatMoney(uah(booking.total))}
          </span>
        </div>
      </Card>

      <Card className="flex flex-col gap-3 p-5">
        <p className="text-heading text-fg font-semibold">{club.name}</p>
        <p className="text-label text-fg-2 flex items-center gap-2">
          <MapPin aria-hidden size={16} className="text-fg-3" />
          {club.address.street}
        </p>
        <div className="mt-1 flex flex-wrap gap-2">
          <a
            href={directionsUrl(club)}
            target="_blank"
            rel="noreferrer noopener"
            className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out"
          >
            <Navigation aria-hidden size={16} />
            {t("directions")}
          </a>
          <a
            href={`tel:${club.phone}`}
            className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out"
          >
            <Phone aria-hidden size={16} />
            {t("callClub")}
          </a>
        </div>
      </Card>

      <p className="text-label text-fg-3 text-center">
        {t("cancellationNote", {
          time: formatMinutes(booking.start - 120),
        })}
      </p>

      {canReview(booking) &&
        (existingReview ? (
          <p className="text-label text-fg-3 text-center">
            {existingReview.status === "published"
              ? t("reviewPublished")
              : outcome === "sent"
                ? t("reviewSent")
                : t("reviewPending")}
          </p>
        ) : (
          <ReviewForm
            bookingId={booking.id}
            action={submitReview}
            invalid={outcome === "invalid" || outcome === "notAllowed"}
          />
        ))}

      <Link
        href="/my"
        className="text-label text-fg-2 hover:text-fg duration-fast text-center transition-colors ease-out"
      >
        {t("myBookings")}
      </Link>

      <Link
        href={`/clubs/${club.city}/${club.slug}`}
        className="text-label text-fg-2 hover:text-fg duration-fast text-center transition-colors ease-out"
      >
        {t("backToClub", { name: club.name })}
      </Link>
    </main>
  );
}

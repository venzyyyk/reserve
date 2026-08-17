import { CalendarClock, QrCode } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { formatMinutes } from "@/entities/booking";
import { bookingRepository } from "@/entities/booking/repository";
import { currentSessionId } from "@/entities/booking/session";
import { clubRepository } from "@/entities/club/repository";
import { formatMoney, uah } from "@/shared/lib/money";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Мої броні",
  robots: { index: false, follow: false },
};

/**
 * "My bookings".
 *
 * Booking is guest-first: there is no account, so there is no login to hang
 * a history off. What there is, is the session cookie the booking flow
 * already sets — so this lists the bookings made from *this device*, which
 * is where a guest looks for their ticket in practice: the same phone they
 * booked on.
 *
 * The honest limit is stated on the page rather than hidden: clear your
 * cookies or switch phones and the list is empty. Recovering a ticket from
 * another device needs phone verification, and SMS delivery is not wired up
 * yet — inventing a lookup by phone number alone would let anyone read a
 * stranger's bookings by guessing digits.
 */
export default async function MyBookingsPage() {
  const [t, session] = await Promise.all([
    getTranslations("my"),
    currentSessionId(),
  ]);

  // No session means this browser has never started a booking, which is the
  // same thing as having none — and not a reason to issue an identifier.
  const bookings = session
    ? await bookingRepository.listForSession(session)
    : [];
  const visible = bookings.filter(
    (booking) =>
      booking.status === "confirmed" || booking.status === "cancelled",
  );

  const clubs = new Map(
    (await clubRepository.all()).map((club) => [club.id, club]),
  );

  const now = new Date();
  const endsAt = (booking: (typeof visible)[number]): number => {
    const day = new Date(`${booking.date}T00:00:00`);
    day.setMinutes(day.getMinutes() + booking.end);
    return day.getTime();
  };

  const upcoming = visible
    .filter(
      (booking) =>
        booking.status === "confirmed" && endsAt(booking) > now.getTime(),
    )
    .sort((a, b) => endsAt(a) - endsAt(b));
  const past = visible
    .filter((booking) => !upcoming.includes(booking))
    .sort((a, b) => endsAt(b) - endsAt(a));

  const dateLabel = (date: string): string =>
    new Intl.DateTimeFormat("uk-UA", {
      weekday: "short",
      day: "numeric",
      month: "long",
      timeZone: "Europe/Kyiv",
    }).format(new Date(`${date}T12:00:00Z`));

  const Row = ({ booking }: { booking: (typeof visible)[number] }) => {
    const club = clubs.get(booking.clubId);
    return (
      <li>
        <Card className="flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex flex-col gap-1">
              <p className="text-heading text-fg font-semibold">
                {club?.name ?? booking.clubId}
              </p>
              <p className="text-label text-fg-2">
                {dateLabel(booking.date)}
                {" · "}
                <span className="tabular-nums">
                  {formatMinutes(booking.start)}–{formatMinutes(booking.end)}
                </span>
              </p>
            </div>
            {booking.status === "cancelled" ? (
              <Badge variant="danger">
                {booking.refundRequired ? t("refunding") : t("cancelled")}
              </Badge>
            ) : (
              <Badge variant="felt">{t("confirmed")}</Badge>
            )}
          </div>

          <div className="border-line flex flex-wrap items-center justify-between gap-3 border-t pt-3">
            <span className="text-label text-fg-3">
              {t("reference")}{" "}
              <span className="text-fg tracking-wider tabular-nums">
                {booking.reference}
              </span>
              {" · "}
              <span className="text-fg tabular-nums">
                {formatMoney(uah(booking.total))}
              </span>
            </span>

            {booking.status === "confirmed" && (
              <Link
                href={`/booking/${booking.id}`}
                className="bg-surface-2 text-label text-fg hover:bg-surface-3 duration-fast inline-flex h-11 items-center gap-2 rounded-full px-5 font-medium transition-colors ease-out"
              >
                <QrCode aria-hidden size={16} />
                {t("openTicket")}
              </Link>
            )}
          </div>
        </Card>
      </li>
    );
  };

  return (
    <main className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 pt-24 pb-16 md:pt-28">
      <header className="flex flex-col gap-2">
        <h1 className="font-display text-title text-fg">{t("title")}</h1>
        <p className="text-body text-fg-2">{t("deviceNote")}</p>
      </header>

      {visible.length === 0 ? (
        <Card className="flex flex-col items-start gap-4 p-6">
          <span
            aria-hidden
            className="bg-surface-2 grid size-12 place-items-center rounded-full"
          >
            <CalendarClock size={22} className="text-fg-3" />
          </span>
          <div className="flex flex-col gap-1">
            <p className="text-heading text-fg font-semibold">
              {t("emptyTitle")}
            </p>
            <p className="text-body text-fg-2">{t("emptyBody")}</p>
          </div>
          <Link
            href="/clubs"
            className="bg-gold text-bg hover:bg-gold-hover duration-fast text-label inline-flex h-11 items-center rounded-full px-6 font-medium transition-colors ease-out focus-visible:[outline-color:var(--color-fg)] active:scale-[0.98]"
          >
            {t("emptyCta")}
          </Link>
        </Card>
      ) : (
        <>
          {upcoming.length > 0 && (
            <section aria-labelledby="upcoming" className="flex flex-col gap-3">
              <h2 id="upcoming" className="text-heading text-fg font-semibold">
                {t("upcoming")}
              </h2>
              <ul className="flex flex-col gap-3">
                {upcoming.map((booking) => (
                  <Row key={booking.id} booking={booking} />
                ))}
              </ul>
            </section>
          )}

          {past.length > 0 && (
            <section aria-labelledby="past" className="flex flex-col gap-3">
              <h2 id="past" className="text-heading text-fg font-semibold">
                {t("past")}
              </h2>
              <ul className="flex flex-col gap-3">
                {past.map((booking) => (
                  <Row key={booking.id} booking={booking} />
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}

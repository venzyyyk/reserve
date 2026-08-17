import { getTranslations } from "next-intl/server";
import { formatMinutes } from "@/entities/booking";
import { todayInKyiv } from "@/entities/club";
import { bookingRepository } from "@/entities/booking/repository";
import { clubRepository } from "@/entities/club/repository";
import { formatMoney, uah } from "@/shared/lib/money";
import { Badge } from "@/shared/ui/badge";
import { AdminPage, AdminTable } from "@/widgets/superadmin";
import { cancelBooking } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * The operational screen: what is happening at the tables today.
 *
 * A day at a time, because that is the question an operator actually has —
 * "who is coming tonight, and did anyone pay for a table we cannot give
 * them?" A refund owed is the one thing that must not be quietly listed
 * among ordinary cancellations, so it gets its own badge.
 */
export default async function BookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; club?: string }>;
}) {
  const query = await searchParams;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(query.date ?? "")
    ? (query.date as string)
    : todayInKyiv();
  const clubFilter = query.club && query.club !== "" ? query.club : undefined;

  const [t, clubs, bookings] = await Promise.all([
    getTranslations("superadmin.bookings"),
    clubRepository.all(),
    bookingRepository.listForDate(date, clubFilter),
  ]);

  const clubName = (id: string) =>
    clubs.find((club) => club.id === id)?.name ?? id;

  const revenue = bookings
    .filter((booking) => booking.status === "confirmed")
    .reduce((sum, booking) => sum + booking.total, 0);

  const statusBadge = (booking: (typeof bookings)[number]) => {
    if (booking.refundRequired) {
      return <Badge variant="danger">{t("refundOwed")}</Badge>;
    }
    switch (booking.status) {
      case "confirmed":
        return <Badge variant="felt">{t("confirmed")}</Badge>;
      case "awaiting_payment":
        return <Badge variant="gold">{t("awaitingPayment")}</Badge>;
      case "cancelled":
        return <Badge variant="neutral">{t("cancelled")}</Badge>;
      default:
        return <Badge variant="neutral">{t("expired")}</Badge>;
    }
  };

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <form
        className="border-line flex flex-wrap items-end gap-4 rounded-md border p-4"
        // A GET form keeps the filter in the URL, so a shift handover can be
        // a pasted link rather than a description of which boxes to tick.
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg-2 font-medium">{t("date")}</span>
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-label text-fg-2 font-medium">{t("club")}</span>
          <select
            name="club"
            defaultValue={clubFilter ?? ""}
            className="bg-surface-2 text-body text-fg h-12 rounded-sm px-4"
          >
            <option value="">{t("allClubs")}</option>
            {clubs.map((club) => (
              <option key={club.id} value={club.id}>
                {club.name}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          className="bg-surface-3 text-fg hover:bg-surface-2 duration-fast text-label inline-flex h-12 items-center rounded-full px-6 font-medium transition-colors ease-out"
        >
          {t("apply")}
        </button>

        <p className="text-label text-fg-3 ml-auto self-center">
          {t("summary", { count: bookings.length })}
          {" · "}
          <span className="text-fg tabular-nums">
            {formatMoney(uah(revenue))}
          </span>
        </p>
      </form>

      {bookings.length === 0 ? (
        <p className="text-body text-fg-3">{t("empty")}</p>
      ) : (
        <AdminTable
          caption={t("caption")}
          head={[
            t("time"),
            t("club"),
            t("table"),
            t("guest"),
            t("total"),
            t("status"),
            "",
          ]}
        >
          {bookings.map((booking) => (
            <tr key={booking.id} className="border-line border-b">
              <td className="text-label text-fg py-3 pr-3 font-medium tabular-nums">
                {formatMinutes(booking.start)}–{formatMinutes(booking.end)}
              </td>
              <td className="text-label text-fg-2 px-3 py-3">
                {clubName(booking.clubId)}
              </td>
              <td className="text-label text-fg-2 px-3 py-3">
                {booking.tableId}
              </td>
              <td className="px-3 py-3">
                <span className="text-label text-fg block tabular-nums">
                  {booking.phone}
                </span>
                <span className="text-caption text-fg-3 tracking-wider">
                  {booking.reference}
                </span>
              </td>
              <td className="text-label text-fg px-3 py-3 tabular-nums">
                {formatMoney(uah(booking.total))}
              </td>
              <td className="px-3 py-3">{statusBadge(booking)}</td>
              <td className="py-3 pl-3 text-right">
                {booking.status === "confirmed" && (
                  <form action={cancelBooking}>
                    <input type="hidden" name="id" value={booking.id} />
                    <input type="hidden" name="date" value={date} />
                    <button
                      type="submit"
                      className="text-label text-fg-3 hover:text-danger duration-fast transition-colors ease-out"
                    >
                      {t("cancel")}
                    </button>
                  </form>
                )}
              </td>
            </tr>
          ))}
        </AdminTable>
      )}

      <p className="text-label text-fg-3">{t("refundNote")}</p>
    </AdminPage>
  );
}

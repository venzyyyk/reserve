import { getTranslations } from "next-intl/server";
import { ROLE_LABELS } from "@/entities/user";
import { userRepository } from "@/entities/user/repository";
import { Badge } from "@/shared/ui/badge";
import { AdminPage, AdminTable } from "@/widgets/superadmin";
import { setUserBlocked } from "../../actions";

export const dynamic = "force-dynamic";

/**
 * Users. Booking is guest-first, so most rows are just a phone number with
 * a booking count — which is exactly what support needs when a club calls
 * about someone who books and never shows up.
 */
export default async function UsersPage() {
  const [t, users] = await Promise.all([
    getTranslations("superadmin.users"),
    userRepository.list(),
  ]);

  return (
    <AdminPage title={t("title")} description={t("description")}>
      <AdminTable
        caption={t("caption")}
        head={[t("user"), t("role"), t("bookings"), t("status"), ""]}
      >
        {users.map((user) => (
          <tr key={user.id} className="border-line border-b">
            <td className="py-3 pr-3">
              <span className="text-label text-fg block font-medium">
                {user.name ?? t("noName")}
              </span>
              <span className="text-caption text-fg-3 tabular-nums">
                {user.phone}
              </span>
            </td>
            <td className="text-label text-fg-2 px-3 py-3">
              {ROLE_LABELS[user.role]}
            </td>
            <td className="text-label text-fg px-3 py-3 tabular-nums">
              {user.bookingsCount}
            </td>
            <td className="px-3 py-3">
              <Badge variant={user.blocked ? "danger" : "felt"}>
                {user.blocked ? t("blocked") : t("ok")}
              </Badge>
            </td>
            <td className="py-3 pl-3 text-right">
              <form action={setUserBlocked}>
                <input type="hidden" name="id" value={user.id} />
                <input
                  type="hidden"
                  name="blocked"
                  value={user.blocked ? "false" : "true"}
                />
                <button
                  type="submit"
                  className="text-label text-fg-3 hover:text-fg duration-fast transition-colors ease-out"
                >
                  {user.blocked ? t("unblock") : t("block")}
                </button>
              </form>
            </td>
          </tr>
        ))}
      </AdminTable>
    </AdminPage>
  );
}

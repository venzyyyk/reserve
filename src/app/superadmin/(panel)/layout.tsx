import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { applicationRepository } from "@/entities/application/repository";
import { reviewRepository } from "@/entities/review/repository";
import { isSuperAdmin } from "@/entities/user/session";
import { AdminNav, type AdminNavItem } from "@/widgets/superadmin";
import { signOutAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Reserve — платформа",
  robots: { index: false, follow: false },
};

/**
 * Super Admin shell.
 *
 * The gate runs here rather than in middleware because the session check
 * needs the same server context every page uses — one place to reason
 * about, and no chance of a page shipping without it.
 *
 * The panel lives in a `(panel)` route group so `/superadmin/login` can sit
 * outside this layout without changing any URL — otherwise the gate would
 * redirect the login page to itself.
 */
export default async function SuperAdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  if (!(await isSuperAdmin())) redirect("/superadmin/login");

  const [t, pendingApplications, pendingReviews] = await Promise.all([
    getTranslations("superadmin.nav"),
    applicationRepository.countPending(),
    reviewRepository.countPending(),
  ]);

  const items: AdminNavItem[] = [
    { href: "/superadmin", id: "overview", label: t("overview") },
    {
      href: "/superadmin/applications",
      id: "applications",
      label: t("applications"),
      ...(pendingApplications > 0 && { badge: pendingApplications }),
    },
    { href: "/superadmin/bookings", id: "bookings", label: t("bookings") },
    { href: "/superadmin/analytics", id: "analytics", label: t("analytics") },
    { href: "/superadmin/clubs", id: "clubs", label: t("clubs") },
    { href: "/superadmin/plans", id: "plans", label: t("plans") },
    {
      href: "/superadmin/placements",
      id: "placements",
      label: t("placements"),
    },
    {
      href: "/superadmin/promotions",
      id: "promotions",
      label: t("promotions"),
    },
    {
      href: "/superadmin/reviews",
      id: "reviews",
      label: t("reviews"),
      ...(pendingReviews > 0 && { badge: pendingReviews }),
    },
    { href: "/superadmin/users", id: "users", label: t("users") },
  ];

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <AdminNav items={items} signOut={signOutAction} />
      <main className="min-w-0 flex-1 px-6 py-8 lg:px-10">{children}</main>
    </div>
  );
}

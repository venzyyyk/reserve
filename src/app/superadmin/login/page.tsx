import { redirect } from "next/navigation";
import { isSuperAdmin } from "@/entities/user/session";
import { LoginForm } from "./login-form";
import { signInAction } from "../actions";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Вхід — платформа",
  robots: { index: false, follow: false },
};

/** Outside the admin layout, otherwise the gate would redirect to itself. */
export default async function SuperAdminLoginPage() {
  if (await isSuperAdmin()) redirect("/superadmin");

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <LoginForm action={signInAction} />
    </main>
  );
}

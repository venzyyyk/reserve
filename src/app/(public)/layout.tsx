import type { ReactNode } from "react";
import { SiteFooter } from "@/widgets/site-footer";
import { SiteHeader } from "@/widgets/site-header";
import { MobileTabBar } from "@/widgets/mobile-tab-bar";

/**
 * Public shell.
 *
 * The bottom padding lives on the outer column, not on `<main>`: the footer
 * comes after main in the flow, so padding on main left the footer's last
 * rows under the fixed tab bar. And it reserves the bar's *real* height —
 * `h-16` plus the home indicator — because on an iPhone the safe-area inset
 * is part of the bar and was not being accounted for.
 */
export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] sm:pb-0">
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
      <MobileTabBar />
    </div>
  );
}

"use client";

import {
  BarChart3,
  Building2,
  CalendarDays,
  LineChart,
  ClipboardCheck,
  LogOut,
  Megaphone,
  MessageSquareWarning,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/shared/lib/cn";

/**
 * Icons live here rather than in the layout: a Lucide component is a
 * function, and functions cannot cross the server/client boundary as
 * props. The layout passes a section id; this map turns it into a glyph.
 */
const ICONS: Record<string, LucideIcon> = {
  overview: BarChart3,
  applications: ClipboardCheck,
  bookings: CalendarDays,
  analytics: LineChart,
  clubs: Building2,
  plans: Tag,
  placements: Sparkles,
  promotions: Megaphone,
  reviews: MessageSquareWarning,
  users: Users,
};

export interface AdminNavItem {
  href: string;
  id: string;
  label: string;
  /** Count of things waiting — the reason to open that section today. */
  badge?: number;
}

/**
 * Admin navigation: a sidebar on desktop, a scrollable strip on mobile.
 *
 * Badges carry the queue depth, so the panel tells you what needs doing
 * before you click anything. Active state uses aria-current, not colour
 * alone — the same rule as the consumer tab bar.
 */
export function AdminNav({
  items,
  signOut,
}: {
  items: readonly AdminNavItem[];
  signOut: () => Promise<void>;
}) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Панель платформи"
      className="border-line bg-surface-1 shrink-0 border-b lg:min-h-dvh lg:w-60 lg:border-r lg:border-b-0"
    >
      <div className="flex items-center justify-between gap-4 px-6 py-5 lg:block">
        <Link href="/" className="font-display text-fg text-lg tracking-tight">
          Reserve
          <span className="text-gold text-label ml-2 font-sans">платформа</span>
        </Link>
      </div>

      <ul className="flex gap-1 overflow-x-auto px-4 pb-3 lg:flex-col lg:overflow-visible lg:pb-4">
        {items.map((item) => {
          const active =
            item.href === "/superadmin"
              ? pathname === "/superadmin"
              : pathname.startsWith(item.href);
          const Icon = ICONS[item.id];
          return (
            <li key={item.href} className="shrink-0 lg:shrink">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "duration-fast flex items-center gap-2.5 rounded-sm px-3 py-2.5 transition-colors ease-out",
                  active
                    ? "bg-surface-3 text-fg"
                    : "text-fg-2 hover:bg-surface-2 hover:text-fg",
                )}
              >
                {Icon && <Icon aria-hidden size={18} className="shrink-0" />}
                <span className="text-label font-medium whitespace-nowrap">
                  {item.label}
                </span>
                {item.badge !== undefined && (
                  <span className="bg-gold-soft text-gold text-caption ml-auto rounded-full px-2 py-0.5 font-medium tabular-nums">
                    {item.badge}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      <form action={signOut} className="px-4 pb-4 lg:mt-auto">
        <button
          type="submit"
          className="text-label text-fg-3 hover:text-fg hover:bg-surface-2 duration-fast flex w-full items-center gap-2.5 rounded-sm px-3 py-2.5 transition-colors ease-out"
        >
          <LogOut aria-hidden size={18} />
          Вийти
        </button>
      </form>
    </nav>
  );
}

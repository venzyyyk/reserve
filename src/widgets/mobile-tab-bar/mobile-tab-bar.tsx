"use client";

import { Heart, Home, Search, User } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { flags } from "@/shared/config/flags";
import { cn } from "@/shared/lib/cn";

interface Tab {
  href: string;
  labelKey: "home" | "clubs" | "favorites" | "profile";
  icon: LucideIcon;
}

/**
 * Mobile tab bar (MPS §2). Composition is flag-driven — a tab never appears
 * before its milestone ships. 64px + safe-area, ≥44px targets, active state
 * carries aria-current (not colour alone).
 */
export function MobileTabBar() {
  const t = useTranslations("tabs");
  const pathname = usePathname();

  const tabs: Tab[] = [
    { href: "/", labelKey: "home", icon: Home },
    { href: "/clubs", labelKey: "clubs", icon: Search },
    ...(flags.favoritesTab
      ? [
          {
            href: "/me/favorites",
            labelKey: "favorites",
            icon: Heart,
          } satisfies Tab,
        ]
      : []),
    { href: "/me", labelKey: "profile", icon: User },
  ];

  return (
    <nav
      aria-label={t("navLabel")}
      className="border-line bg-surface-1/80 fixed inset-x-0 bottom-0 z-40 border-t backdrop-blur-xl sm:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="flex h-16 items-stretch">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "duration-fast flex h-full flex-col items-center justify-center gap-1 transition-colors ease-out",
                  active ? "text-gold" : "text-fg-3 hover:text-fg-2",
                )}
              >
                <Icon aria-hidden size={20} strokeWidth={active ? 2 : 1.75} />
                <span className="text-caption font-medium">
                  {t(tab.labelKey)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/shared/lib/cn";

export interface BreadcrumbItem {
  name: string;
  href: string;
}

export interface BreadcrumbsProps {
  items: readonly BreadcrumbItem[];
  /** Accessible name for the nav landmark — callers pass a translated label. */
  label: string;
  className?: string;
}

/**
 * Visual breadcrumbs. Pair with `breadcrumbJsonLd` on the same page so the
 * markup and the structured data can never drift apart.
 */
export function Breadcrumbs({ items, label, className }: BreadcrumbsProps) {
  return (
    <nav aria-label={label} className={cn("text-label", className)}>
      <ol className="flex flex-wrap items-center gap-1.5">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={item.href} className="flex items-center gap-1.5">
              {isLast ? (
                <span aria-current="page" className="text-fg-2">
                  {item.name}
                </span>
              ) : (
                <>
                  <Link
                    href={item.href}
                    className="text-fg-3 hover:text-fg duration-fast rounded-sm transition-colors ease-out"
                  >
                    {item.name}
                  </Link>
                  <ChevronRight aria-hidden size={14} className="text-fg-3" />
                </>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

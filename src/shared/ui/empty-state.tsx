import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  /** Exactly one action (MPS §3: icon + one line + one action). */
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 px-6 py-12 text-center",
        className,
      )}
    >
      <Icon aria-hidden size={40} strokeWidth={1.5} className="text-fg-3" />
      <div className="flex flex-col gap-1">
        <p className="text-heading text-fg font-semibold">{title}</p>
        {description && (
          <p className="text-body text-fg-2 max-w-sm">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

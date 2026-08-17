import type { ReactNode } from "react";
import { cn } from "@/shared/lib/cn";
import { Card } from "@/shared/ui/card";

/** Consistent page header for every admin section. */
export function AdminPage({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-[1100px] flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="font-display text-title text-fg">{title}</h1>
          {description && (
            <p className="text-label text-fg-2 max-w-xl">{description}</p>
          )}
        </div>
        {action}
      </header>
      {children}
    </div>
  );
}

/** A single number that answers one question. */
export function StatCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "neutral" | "gold" | "felt" | "danger";
}) {
  return (
    <Card className="flex flex-col gap-1 p-5">
      <p className="text-label text-fg-3">{label}</p>
      <p
        className={cn(
          "font-display text-title tabular-nums",
          tone === "gold" && "text-gold",
          tone === "felt" && "text-[#6FBF73]",
          tone === "danger" && "text-danger",
          tone === "neutral" && "text-fg",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-caption text-fg-3">{hint}</p>}
    </Card>
  );
}

/** Table shell — admin tables are dense, scrollable and consistent. */
export function AdminTable({
  head,
  children,
  caption,
}: {
  head: readonly string[];
  children: ReactNode;
  caption: string;
}) {
  return (
    <div className="-mx-6 overflow-x-auto px-6 lg:mx-0 lg:px-0">
      <table className="w-full min-w-[640px] border-collapse">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-line border-b">
            {head.map((cell) => (
              <th
                key={cell}
                scope="col"
                className="text-caption text-fg-3 px-3 pb-3 text-left font-medium first:pl-0 last:pr-0"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

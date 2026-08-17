import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Selection state — rendered via aria-pressed (never color alone). */
  selected?: boolean;
}

/** Filter chip (MPS §4: type filters, date strips, presets). */
export function Chip({
  selected = false,
  className,
  children,
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={selected}
      className={cn(
        // 44px on touch, back to a dense 36px where there is a pointer:
        // these are the filter and time-slot targets, tapped with a thumb.
        "text-label inline-flex h-11 min-w-11 items-center justify-center gap-1.5 rounded-full px-4 font-medium select-none sm:h-9",
        "duration-fast transition-colors ease-out active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-40",
        selected
          ? "bg-gold-soft text-gold shadow-[inset_0_0_0_1px_var(--color-gold)]"
          : "bg-surface-2 text-fg-2 hover:bg-surface-3 hover:text-fg",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

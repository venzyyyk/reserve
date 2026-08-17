import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

const badge = cva(
  "text-caption inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium",
  {
    variants: {
      variant: {
        neutral: "bg-surface-3 text-fg-2",
        gold: "bg-gold-soft text-gold",
        felt: "bg-felt-soft text-[#6FBF73]",
        danger: "bg-danger-soft text-[#E57373]",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badge> {
  /** Live pulsing dot (MPS: LiveDot) — decorative, meaning must be in text. */
  live?: boolean;
}

export function Badge({
  variant,
  live = false,
  className,
  children,
  ...rest
}: BadgeProps) {
  return (
    <span className={cn(badge({ variant }), className)} {...rest}>
      {live && (
        <span
          aria-hidden
          className="animate-live size-1.5 rounded-full bg-current"
        />
      )}
      {children}
    </span>
  );
}

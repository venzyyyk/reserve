import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import { Spinner } from "./spinner";

const button = cva(
  [
    "relative inline-flex items-center justify-center gap-2 rounded-full font-medium select-none",
    "duration-fast transition-[background-color,box-shadow,transform] ease-out",
    "active:scale-[0.98]",
    "disabled:pointer-events-none disabled:opacity-40",
  ],
  {
    variants: {
      variant: {
        // Gold budget (MPS §6): max one primary per view.
        primary:
          "bg-gold text-bg hover:bg-gold-hover focus-visible:[outline-color:var(--color-fg)]",
        secondary: "bg-surface-2 text-fg shadow-elev-1 hover:bg-surface-3",
        ghost: "text-fg-2 hover:bg-surface-2 hover:text-fg",
        danger: "bg-danger-soft text-danger hover:bg-danger hover:text-fg",
      },
      size: {
        sm: "text-label h-9 px-4",
        md: "text-body h-11 px-6",
        lg: "text-body h-14 px-8",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof button> {
  /** Keeps width, swaps label for a spinner, sets aria-busy. */
  loading?: boolean;
}

export function Button({
  variant,
  size,
  loading = false,
  disabled,
  className,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(button({ variant, size }), className)}
      {...rest}
    >
      <span
        className={cn("inline-flex items-center gap-2", loading && "invisible")}
      >
        {children}
      </span>
      {loading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner size={size === "sm" ? 16 : 20} />
        </span>
      )}
    </button>
  );
}

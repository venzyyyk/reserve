import { ChevronDown } from "lucide-react";
import { useId, type SelectHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: readonly SelectOption[];
  /** Visually hide the label (still announced) — for compact composites. */
  hideLabel?: boolean;
  /** Guidance under the control; replaced by `error` when one is present. */
  hint?: string;
  error?: string;
}

/**
 * Native select, Cue-styled. Native by design (MPS §7 mobile: native
 * pickers where they win) — the browser sheet beats any custom dropdown on
 * touch. Reused by the booking flow (city/club pickers) at M2.
 */
export function Select({
  label,
  options,
  hideLabel = false,
  hint,
  error,
  id,
  className,
  ...rest
}: SelectProps) {
  const autoId = useId();
  const selectId = id ?? autoId;
  const describedBy = error
    ? `${selectId}-error`
    : hint
      ? `${selectId}-hint`
      : undefined;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label
        htmlFor={selectId}
        className={cn(
          "text-label text-fg-2 font-medium",
          hideLabel && "sr-only",
        )}
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={cn(
            "bg-surface-2 text-body text-fg h-12 w-full appearance-none rounded-sm px-4 pr-10",
            "duration-fast transition-colors ease-out",
            "disabled:cursor-not-allowed disabled:opacity-40",
            error && "[outline:2px_solid_var(--color-danger)] outline-offset-2",
          )}
          {...rest}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden
          size={16}
          className="text-fg-3 pointer-events-none absolute top-1/2 right-4 -translate-y-1/2"
        />
      </div>
      {error ? (
        <p
          id={`${selectId}-error`}
          role="alert"
          className="text-label text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${selectId}-hint`} className="text-label text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

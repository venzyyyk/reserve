import { useId, type InputHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  /** Error message; presence switches the field to its error state. */
  error?: string;
  hint?: string;
}

export function Input({
  label,
  error,
  hint,
  id,
  className,
  ...rest
}: InputProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const describedById = error
    ? `${inputId}-error`
    : hint
      ? `${inputId}-hint`
      : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={inputId} className="text-label text-fg-2 font-medium">
        {label}
      </label>
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedById}
        className={cn(
          "bg-surface-2 text-body text-fg placeholder:text-fg-3 h-12 rounded-sm px-4",
          "duration-fast transition-colors ease-out",
          "disabled:cursor-not-allowed disabled:opacity-40",
          error && "[outline:2px_solid_var(--color-danger)] outline-offset-2",
        )}
        {...rest}
      />
      {error ? (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-label text-danger"
        >
          {error}
        </p>
      ) : hint ? (
        <p id={`${inputId}-hint`} className="text-label text-fg-3">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

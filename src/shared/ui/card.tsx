import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Card lift on hover (MPS §3) — only for interactive cards. */
  interactive?: boolean;
}

/** Surface card: surface-1 + edge-light (elevation is light, not shadow). */
export function Card({ interactive = false, className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "bg-surface-1 shadow-elev-1 rounded-lg",
        interactive &&
          "duration-fast hover:shadow-elev-2 transition-[transform,box-shadow] ease-out hover:-translate-y-1",
        className,
      )}
      {...rest}
    />
  );
}

export function CardHeader({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1 p-6 pb-0", className)} {...rest} />
  );
}

export function CardTitle({
  className,
  ...rest
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-heading text-fg font-semibold", className)}
      {...rest}
    />
  );
}

export function CardContent({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-6", className)} {...rest} />;
}

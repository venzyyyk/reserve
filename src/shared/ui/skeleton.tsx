import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Content-loading placeholder (MPS §3: skeletons for content, never spinners).
 * Layout-exact: consumers must size it to the content it replaces (no CLS).
 */
export function Skeleton({
  className,
  ...rest
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-sm",
        "bg-[linear-gradient(90deg,#1c1c1c_25%,#242424_50%,#1c1c1c_75%)] bg-[length:200%_100%]",
        className,
      )}
      {...rest}
    />
  );
}

import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";

/**
 * Layout rhythm primitive (MPS §3: container 1200/24, sections breathe at
 * 96–128 desktop / 64 mobile). Every page-level widget composes this instead
 * of re-deriving spacing.
 */
export function Section({ className, ...rest }: HTMLAttributes<HTMLElement>) {
  return (
    <section
      className={cn(
        "mx-auto w-full max-w-[1200px] px-6 py-16 md:py-24",
        className,
      )}
      {...rest}
    />
  );
}

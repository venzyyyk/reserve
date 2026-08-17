"use client";

import * as Switch from "@radix-ui/react-switch";
import { useId } from "react";
import { cn } from "@/shared/lib/cn";

export interface ToggleProps {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export function Toggle({ label, className, ...rest }: ToggleProps) {
  const id = useId();
  return (
    <div className={cn("flex items-center justify-between gap-4", className)}>
      <label htmlFor={id} className="text-body text-fg">
        {label}
      </label>
      <Switch.Root
        id={id}
        className={cn(
          "bg-surface-3 h-6 w-11 shrink-0 rounded-full p-0.5",
          "duration-base transition-colors ease-out",
          "data-[state=checked]:bg-gold",
          "disabled:cursor-not-allowed disabled:opacity-40",
        )}
        {...rest}
      >
        <Switch.Thumb
          className={cn(
            "bg-fg shadow-elev-1 block size-5 rounded-full",
            "duration-base transition-transform ease-out",
            "data-[state=checked]:translate-x-5",
          )}
        />
      </Switch.Root>
    </div>
  );
}

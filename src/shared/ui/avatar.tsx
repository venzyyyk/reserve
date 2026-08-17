"use client";

import * as RadixAvatar from "@radix-ui/react-avatar";
import { cn } from "@/shared/lib/cn";

export interface AvatarProps {
  name: string;
  src?: string;
  size?: 32 | 40 | 48;
  className?: string;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  return (
    <RadixAvatar.Root
      className={cn(
        "bg-surface-3 inline-flex shrink-0 overflow-hidden rounded-full select-none",
        className,
      )}
      style={{ width: size, height: size }}
    >
      {src && (
        <RadixAvatar.Image
          src={src}
          alt={name}
          className="size-full object-cover"
        />
      )}
      <RadixAvatar.Fallback
        delayMs={src ? 300 : 0}
        className="text-label text-fg-2 grid size-full place-items-center font-medium"
      >
        {initials(name)}
      </RadixAvatar.Fallback>
    </RadixAvatar.Root>
  );
}

import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * Cue's type scale lives in Tailwind's `--text-*` namespace, so its utilities
 * are named `text-body`, `text-label`, `text-caption` — spelled exactly like
 * the colour utilities `text-fg`, `text-gold`, `text-danger`. Nothing in the
 * class name distinguishes them, and tailwind-merge's built-in heuristic only
 * recognises t-shirt sizes (`text-sm`, `text-2xl`) as font sizes. So it filed
 * every one of ours under "text colour", saw two classes in one group, and
 * kept whichever came last.
 *
 * That silently deleted half the design system, in both directions:
 *
 * - `Button` lists the colour first and the size second, so `primary` lost
 *   `text-bg` and inherited white from `body`. White on gold is 2.55:1, which
 *   is how Lighthouse found this.
 * - `Badge`, `Chip`, `CardTitle`, `Input` and `Select` list them the other way
 *   round and lost their *font size*, rendering at the inherited 15px instead
 *   of the 12–18px the scale specifies.
 *
 * Declaring the scale is the entire fix, and it cannot be inferred — which is
 * why `cn.test.ts` reads the theme and fails if the two drift apart.
 */
export const TYPE_SCALE = [
  "display-xl",
  "display",
  "title",
  "heading",
  "body",
  "label",
  "caption",
  "price",
] as const;

const twMerge = extendTailwindMerge({
  extend: { classGroups: { "font-size": [{ text: [...TYPE_SCALE] }] } },
});

/** Merge class values with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

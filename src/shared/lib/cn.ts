import { clsx, type ClassValue } from "clsx";
import { createTailwindMerge, getDefaultConfig } from "tailwind-merge";

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

/**
 * Registered in `theme.text`, which is where tailwind-merge's own `font-size`
 * group reads its scale from — so our names arrive by the same door as
 * `text-sm` and `text-2xl` rather than as a bolted-on second rule.
 *
 * `extendTailwindMerge` would say this in one line, but it ships
 * `mergeConfigs`, a deep recursive merge, to add one entry. Measured on the
 * same bundle: extend costs 327 B gzip, this costs 71 B. Both are correct;
 * one is over four times the price, and this file is in every client bundle.
 */
const twMerge = createTailwindMerge(() => {
  const config = getDefaultConfig();
  return {
    ...config,
    theme: { ...config.theme, text: [...config.theme.text, ...TYPE_SCALE] },
  };
});

/** Merge class values with Tailwind conflict resolution. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

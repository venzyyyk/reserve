import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { TYPE_SCALE, cn } from "../cn";

/**
 * `cn` has to be told which `text-*` utilities are font sizes, because the
 * class name alone cannot say whether `text-label` means a size or a colour.
 * A hand-maintained list is a list that goes stale, and the failure mode is
 * invisible: no error, no warning, just a component quietly rendering without
 * its colour or without its size.
 *
 * So the theme is the source of truth and this test is the alarm.
 */
const theme = readFileSync(
  new URL("../../styles/globals.css", import.meta.url),
  "utf8",
);

const scaleFromTheme = [
  ...new Set(
    [...theme.matchAll(/^\s*--text-([a-z0-9-]+):/gm)]
      .map((match) => match[1])
      .filter((name): name is string => name !== undefined)
      // `--text-body--line-height` and friends configure a size, they are not
      // sizes themselves.
      .filter((name) => !name.includes("--")),
  ),
];

describe("type scale registration", () => {
  it("knows every size the theme defines", () => {
    expect([...TYPE_SCALE].sort()).toEqual(scaleFromTheme.sort());
  });

  it("no longer drops a colour when a size follows it", () => {
    // The exact regression Lighthouse caught: the gold button's dark ink.
    expect(cn("bg-gold text-bg", "text-body h-14")).toContain("text-bg");
    expect(cn("bg-surface-2 text-fg", "text-label")).toContain("text-fg");
  });

  it("no longer drops a size when a colour follows it", () => {
    // Badge, Chip, CardTitle, Input and Select all order them this way.
    expect(cn("text-caption", "bg-surface-3 text-fg-2")).toContain(
      "text-caption",
    );
    expect(cn("text-heading text-fg font-semibold")).toContain("text-heading");
  });

  it("still resolves genuine conflicts", () => {
    expect(cn("text-body", "text-label")).toBe("text-label");
    expect(cn("text-fg", "text-fg-2")).toBe("text-fg-2");
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});

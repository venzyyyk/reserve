import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import messages from "../../../../messages/uk.json";
import { CLIENT_NAMESPACES } from "../i18n-namespaces";

const root = path.join(process.cwd(), "src");

/**
 * The client dictionary is an allowlist, and an allowlist that drifts is
 * worse than none: a missing namespace throws at runtime in the browser
 * only, on whatever page happens to use it. This reads the source instead
 * of trusting anyone to remember.
 */
describe("client i18n namespaces", () => {
  const clientFiles = readdirSync(root, {
    recursive: true,
    encoding: "utf8",
  })
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => path.join(root, entry))
    .map((file) => ({ file, source: readFileSync(file, "utf8") }))
    .filter(({ source }) => /^["']use client["'];/m.test(source));

  it("finds the client components (guards against a broken glob)", () => {
    expect(clientFiles.length).toBeGreaterThan(5);
  });

  it("covers every namespace a client component reads", () => {
    const used = new Set<string>();
    for (const { source } of clientFiles) {
      for (const match of source.matchAll(
        /useTranslations\(\s*["']([^"']+)["']/g,
      )) {
        const namespace = match[1]?.split(".")[0];
        if (namespace) used.add(namespace);
      }
    }
    const missing = [...used].filter(
      (ns) => !(CLIENT_NAMESPACES as readonly string[]).includes(ns),
    );
    expect(missing).toEqual([]);
  });

  it("lists only namespaces that exist, so nothing is silently dropped", () => {
    const unknown = CLIENT_NAMESPACES.filter(
      (ns) => !(ns in (messages as Record<string, unknown>)),
    );
    expect(unknown).toEqual([]);
  });
});

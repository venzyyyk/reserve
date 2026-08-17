import { readFileSync, statSync } from "node:fs";
import { gzipSync } from "node:zlib";
import path from "node:path";

/**
 * First-load JS budgets (MPS §8), gzipped bytes per route. Run after build.
 *
 * Every route in the manifest is checked: unknown routes fall back to
 * DEFAULT_BUDGET, so a new page cannot silently ship unbudgeted.
 */
const DEFAULT_BUDGET = 130_000;

/**
 * Keys are normalised routes: App Router group segments like "(public)/"
 * are stripped, so a budget survives a route being moved between groups.
 */
const BUDGETS = {
  // M0 baseline: 100.5 KB. M1a delta = next-intl client runtime (~12 KB,
  // required by the i18n policy) + hero form + icons. Measured 128.2 KB.
  "/page": 132_000,
  // Catalog additionally hydrates filters and the nuqs adapter (135.7 KB).
  "/clubs/page": 140_000,
  "/clubs/[city]/page": 130_000,
  // Club page adds only the share button over the city page (measured 127.0).
  "/clubs/[city]/[slug]/page": 132_000,
  // The booking flow is the one route that carries product runtime: Query,
  // the flow UI and the payment step. MPS §8 budgets it at ≤80 KB above the
  // shared baseline.
  "/clubs/[city]/[slug]/book/page": 185_000,
  // Ticket is fully server-rendered — the QR is SVG in the HTML.
  "/booking/[id]/page": 115_000,
  // For Clubs is fully server-rendered — pricing, comparison and FAQ are
  // static markup and native <details>, so it sits below the public layout.
  "/for-clubs/page": 128_000,
  // Apply adds one progressively-enhanced form (useActionState) on top of
  // the public layout: +1.3 KB. Budgeted tight so a heavier form is caught.
  "/for-clubs/apply/page": 131_000,
  // Super Admin renders on the server and mounts no product providers, so
  // it stays on the shared baseline; the login form is the only client bit.
  "/superadmin/layout": 118_000,
  "/(public)/layout": 130_000,
  "/layout": 116_000,
  "/_not-found/page": 103_000,
  "/not-found": 107_000,
  "/error": 125_000,
};

const normalise = (route) => route.replace(/\/\([^)]+\)/g, "") || "/";

const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(path.join(root, ".next", "app-build-manifest.json"), "utf8"),
);

let failed = false;
for (const [rawRoute, files] of Object.entries(manifest.pages)) {
  // Exact route first (layouts differ per group), then the normalised form.
  const budget =
    BUDGETS[rawRoute] ?? BUDGETS[normalise(rawRoute)] ?? DEFAULT_BUDGET;
  const route = rawRoute;
  let total = 0;
  for (const file of new Set(files)) {
    if (!file.endsWith(".js")) continue;
    const filePath = path.join(root, ".next", file);
    statSync(filePath);
    total += gzipSync(readFileSync(filePath)).length;
  }
  const kb = (total / 1024).toFixed(1);
  const budgetKb = (budget / 1024).toFixed(0);
  if (total > budget) {
    console.error(`✗ ${route}: ${kb} KB gz — over budget (${budgetKb} KB)`);
    failed = true;
  } else {
    console.log(`✓ ${route}: ${kb} KB gz (budget ${budgetKb} KB)`);
  }
}

process.exit(failed ? 1 : 0);

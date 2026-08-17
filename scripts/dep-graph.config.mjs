/**
 * Architecture contract for the dependency graph tool.
 *
 * This mirrors `eslint.config.mjs` (boundaries plugin) deliberately: ESLint
 * fails the *author* at edit time with a precise message, the graph fails the
 * *build* with a whole-repo picture and machine-readable evidence. Keeping
 * both means neither can silently rot — if they ever disagree, that
 * disagreement is itself the bug worth investigating.
 */

/** Higher rank = closer to the app shell. Dependencies must point down. */
export const LAYERS = {
  app: { rank: 5, dir: "app" },
  providers: { rank: 4, dir: "providers" },
  widgets: { rank: 3, dir: "widgets" },
  features: { rank: 2, dir: "features" },
  entities: { rank: 1, dir: "entities" },
  shared: { rank: 0, dir: "shared" },
  // Framework plumbing for next-intl; may only read shared config.
  i18n: { rank: 0, dir: "i18n" },
};

/** Explicit allow-list per layer. Anything absent is a violation. */
export const ALLOWED = {
  app: [
    "app",
    "providers",
    "widgets",
    "features",
    "entities",
    "shared",
    "i18n",
  ],
  providers: ["providers", "shared"],
  widgets: ["widgets", "features", "entities", "shared"],
  features: ["features", "entities", "shared"],
  entities: ["entities", "shared"],
  shared: ["shared"],
  i18n: ["shared"],
  // Files directly under src/ (instrumentation, middleware).
  root: ["shared", "i18n", "entities"],
};

/**
 * Layers whose slices must stay isolated: `features/a` may not import
 * `features/b` — two features meet in a widget.
 *
 * Entities are deliberately NOT isolated (ADR-0008): the domain has real
 * relationships (a booking is for a table in a club), and forcing them
 * apart would mean re-deriving club rules inside booking. Cycles between
 * entities are still caught by the runtime-cycle check.
 *
 * Widgets may compose each other — horizontal composition, not an
 * inversion (ADR-0001).
 */
export const SLICE_ISOLATED = ["features"];

/** Excluded from the product graph — tooling, not shipped architecture. */
export const IGNORE_PATTERNS = [
  /\/__tests__\//,
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /\/test-utils\.tsx?$/,
];

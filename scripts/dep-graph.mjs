#!/usr/bin/env node
/**
 * Dependency graph tool (engineering toolchain, not product code).
 *
 *   npm run graph          analyse, write reports, fail on violations
 *   npm run graph -- --quiet   machine use: reports only, no table
 *
 * Emits:
 *   reports/dependency-graph.json   machine-readable report (CI artifact)
 *   reports/dependency-graph.mmd    Mermaid diagram for humans/docs
 *
 * Exit code 1 when any of these are found:
 *   • dependency inversions (an edge pointing up the layer ranks)
 *   • illegal layer edges (not in the allow-list, incl. cross-slice)
 *   • runtime import cycles
 *
 * Type-only imports are tracked but excluded from cycle analysis: TypeScript
 * erases them, so they cannot cause a module-init cycle. Dynamic imports are
 * likewise excluded from cycles (they resolve after evaluation) but still
 * recorded as edges.
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  ALLOWED,
  IGNORE_PATTERNS,
  LAYERS,
  SLICE_ISOLATED,
} from "./dep-graph.config.mjs";

const ROOT = process.cwd();
const SRC = "src";
const OUT_DIR = "reports";
const quiet = process.argv.includes("--quiet");

// ── collect source files ──────────────────────────────────────────────────
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, acc);
    else if (/\.tsx?$/.test(full)) acc.push(full.split(path.sep).join("/"));
  }
  return acc;
}

const files = walk(SRC).filter(
  (f) => !IGNORE_PATTERNS.some((re) => re.test(`/${f}`)),
);

// ── classification ────────────────────────────────────────────────────────
function layerOf(file) {
  const rest = file.slice(SRC.length + 1);
  const top = rest.split("/")[0];
  const match = Object.entries(LAYERS).find(([, meta]) => meta.dir === top);
  return match ? match[0] : "root";
}

/** "features/club-search" — the isolation unit inside a layer. */
function sliceOf(file) {
  const parts = file.slice(SRC.length + 1).split("/");
  return parts.length > 1 ? `${parts[0]}/${parts[1]}` : parts[0];
}

// ── module resolution (alias + relative) ──────────────────────────────────
const EXTENSIONS = [".ts", ".tsx", "/index.ts", "/index.tsx", ".json"];

function resolveSpecifier(spec, fromFile) {
  let base;
  if (spec.startsWith("@/")) base = path.posix.join(SRC, spec.slice(2));
  else if (spec.startsWith("."))
    base = path.posix.join(path.posix.dirname(fromFile), spec);
  else return null; // external package — outside the architecture graph

  for (const ext of ["", ...EXTENSIONS]) {
    const candidate = base + ext;
    if (
      !existsSync(path.join(ROOT, candidate)) ||
      !/\.(tsx?|json)$/.test(candidate)
    )
      continue;
    // Content and config outside src/ (message catalogues, fixtures) are
    // data, not architecture — they have no layer and cannot invert one.
    return candidate.startsWith(`${SRC}/`) ? candidate : null;
  }
  return null;
}

// ── parse imports ─────────────────────────────────────────────────────────
const STATIC_RE =
  /(?:^|\n)\s*(?:import|export)\s+((?:type\s+)?[\s\S]*?)\s*from\s*["']([^"']+)["']/g;
const BARE_IMPORT_RE = /(?:^|\n)\s*import\s+["']([^"']+)["']/g;
const DYNAMIC_RE = /import\(\s*["']([^"']+)["']/g;

const edges = [];
for (const file of files) {
  const source = readFileSync(path.join(ROOT, file), "utf8");
  const push = (spec, kind) => {
    const target = resolveSpecifier(spec, file);
    if (!target || IGNORE_PATTERNS.some((re) => re.test(`/${target}`))) return;
    edges.push({
      from: file,
      to: target,
      fromLayer: layerOf(file),
      toLayer: layerOf(target),
      fromSlice: sliceOf(file),
      toSlice: sliceOf(target),
      kind,
    });
  };

  for (const m of source.matchAll(STATIC_RE)) {
    push(m[2], /^type\s/.test(m[1]) ? "type" : "value");
  }
  for (const m of source.matchAll(BARE_IMPORT_RE)) push(m[1], "side-effect");
  for (const m of source.matchAll(DYNAMIC_RE)) push(m[1], "dynamic");
}

// ── rule checks ───────────────────────────────────────────────────────────
const violations = [];

for (const edge of edges) {
  const fromRank = LAYERS[edge.fromLayer]?.rank ?? -1;
  const toRank = LAYERS[edge.toLayer]?.rank ?? -1;

  if (toRank > fromRank) {
    violations.push({
      rule: "dependency-inversion",
      message: `${edge.fromLayer} imports ${edge.toLayer} — dependencies must point down`,
      ...edge,
    });
    continue;
  }
  if (!(ALLOWED[edge.fromLayer] ?? []).includes(edge.toLayer)) {
    violations.push({
      rule: "illegal-layer-edge",
      message: `${edge.fromLayer} may not import ${edge.toLayer}`,
      ...edge,
    });
    continue;
  }
  if (
    SLICE_ISOLATED.includes(edge.fromLayer) &&
    edge.fromLayer === edge.toLayer &&
    edge.fromSlice !== edge.toSlice
  ) {
    violations.push({
      rule: "cross-slice-import",
      message: `${edge.fromSlice} imports ${edge.toSlice} — slices in "${edge.fromLayer}" must stay isolated`,
      ...edge,
    });
  }
}

// ── cycle detection (runtime edges only) ──────────────────────────────────
function findCycles(adjacency) {
  const GREY = 1;
  const BLACK = 2;
  const colour = new Map(); // unvisited nodes are simply absent

  const found = new Set();

  const visit = (node, stack) => {
    if (colour.get(node) === GREY) {
      const cycle = stack.slice(stack.indexOf(node)).concat(node);
      found.add(cycle.join(" → "));
      return;
    }
    if (colour.get(node) === BLACK) return;
    colour.set(node, GREY);
    stack.push(node);
    for (const next of adjacency.get(node) ?? []) visit(next, stack);
    stack.pop();
    colour.set(node, BLACK);
  };

  for (const node of adjacency.keys()) visit(node, []);
  return [...found];
}

const runtimeAdjacency = new Map(files.map((f) => [f, []]));
const fullAdjacency = new Map(files.map((f) => [f, []]));
for (const edge of edges) {
  fullAdjacency.get(edge.from)?.push(edge.to);
  if (edge.kind === "value" || edge.kind === "side-effect") {
    runtimeAdjacency.get(edge.from)?.push(edge.to);
  }
}

const runtimeCycles = findCycles(runtimeAdjacency);
const typeLevelCycles = findCycles(fullAdjacency).filter(
  (c) => !runtimeCycles.includes(c),
);

for (const cycle of runtimeCycles) {
  violations.push({
    rule: "runtime-cycle",
    message: `Runtime import cycle: ${cycle}`,
  });
}

// ── aggregate ─────────────────────────────────────────────────────────────
const layerEdges = {};
for (const edge of edges) {
  const key = `${edge.fromLayer} -> ${edge.toLayer}`;
  layerEdges[key] = (layerEdges[key] ?? 0) + 1;
}

const sliceEdges = [
  ...new Set(
    edges
      .filter((e) => e.fromSlice !== e.toSlice)
      .map((e) => `${e.fromSlice} -> ${e.toSlice}`),
  ),
].sort();

const report = {
  generatedAt: new Date().toISOString(),
  ok: violations.length === 0,
  totals: {
    modules: files.length,
    edges: edges.length,
    typeOnlyEdges: edges.filter((e) => e.kind === "type").length,
    dynamicEdges: edges.filter((e) => e.kind === "dynamic").length,
  },
  layerEdges,
  sliceEdges,
  violations,
  // Informational: legal, but worth seeing in review.
  notes: {
    typeLevelCycles,
    // Widget-to-widget composition across slices: legal (ADR-0001), but
    // surfaced so review can question whether it is still deliberate.
    horizontalWidgetEdges: [
      ...new Set(
        edges
          .filter(
            (e) =>
              e.fromLayer === "widgets" &&
              e.toLayer === "widgets" &&
              e.fromSlice !== e.toSlice,
          )
          .map((e) => `${e.fromSlice} -> ${e.toSlice}`),
      ),
    ],
  },
};

// ── Mermaid diagram ───────────────────────────────────────────────────────
function mermaid() {
  const ordered = Object.entries(LAYERS)
    .filter(([name]) =>
      edges.some((e) => e.fromLayer === name || e.toLayer === name),
    )
    .sort((a, b) => b[1].rank - a[1].rank)
    .map(([name]) => name);

  const lines = [
    "%% Generated by `npm run graph` — do not edit by hand.",
    "flowchart TD",
  ];

  for (const layer of ordered) {
    const slices = [
      ...new Set(
        files.filter((f) => layerOf(f) === layer).map((f) => sliceOf(f)),
      ),
    ].sort();
    lines.push(`  subgraph ${layer}["${layer} (rank ${LAYERS[layer].rank})"]`);
    for (const slice of slices) lines.push(`    ${id(slice)}["${slice}"]`);
    lines.push("  end");
  }

  const seen = new Set();
  for (const edge of edges) {
    if (edge.fromSlice === edge.toSlice) continue;
    const key = `${edge.fromSlice}|${edge.toSlice}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const arrow = edge.kind === "type" ? "-.->|type|" : "-->";
    lines.push(`  ${id(edge.fromSlice)} ${arrow} ${id(edge.toSlice)}`);
  }

  for (const v of violations.filter((x) => x.from)) {
    lines.push(
      `  ${id(v.fromSlice)} ==>|VIOLATION: ${v.rule}| ${id(v.toSlice)}`,
    );
  }

  lines.push("  classDef violation stroke:#D32F2F,stroke-width:2px;");
  return lines.join("\n") + "\n";
}

function id(slice) {
  return slice.replace(/[^a-zA-Z0-9]/g, "_");
}

// ── write + report ────────────────────────────────────────────────────────
mkdirSync(path.join(ROOT, OUT_DIR), { recursive: true });
writeFileSync(
  path.join(ROOT, OUT_DIR, "dependency-graph.json"),
  JSON.stringify(report, null, 2),
);
writeFileSync(path.join(ROOT, OUT_DIR, "dependency-graph.mmd"), mermaid());

if (!quiet) {
  console.log(
    `\nDependency graph — ${report.totals.modules} modules, ${report.totals.edges} edges\n`,
  );
  for (const [key, count] of Object.entries(layerEdges).sort()) {
    console.log(`  ${key.padEnd(30)} ${count}`);
  }
  if (typeLevelCycles.length) {
    console.log(
      `\n  note: ${typeLevelCycles.length} type-only cycle(s) — erased at build, allowed`,
    );
  }
  console.log("");
}

if (violations.length) {
  console.error(`✗ ${violations.length} architecture violation(s):\n`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.message}`);
    if (v.from) console.error(`      ${v.from}\n        → ${v.to}`);
  }
  console.error(`\nReport: ${OUT_DIR}/dependency-graph.json`);
  process.exit(1);
}

console.log(
  `✓ No inversions, illegal edges or runtime cycles. Reports written to ${OUT_DIR}/.`,
);

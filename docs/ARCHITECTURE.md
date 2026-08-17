# Architecture

Authoritative summary — full rationale in `../MPS.md` §8.

**How this document relates to the decision log:** this file describes the
architecture as it _is_. [`decisions/`](decisions/README.md) records _why_,
one decision at a time, append-only. When a decision changes, a new ADR
supersedes the old one and this summary is updated to match — the old ADR is
never edited. If the two ever disagree, the ADRs win and this file is stale.

## Layers

`app → widgets → features → entities → shared`, dependencies point down,
enforced by `eslint-plugin-boundaries` (see `eslint.config.mjs`). Two
features may only meet inside a widget. `providers/` is the composition
root; `src/i18n/` is framework plumbing for next-intl.

## State ownership

| Kind          | Owner                                                         |
| ------------- | ------------------------------------------------------------- |
| Server state  | TanStack Query (`shared/api/query.ts` defaults)               |
| Realtime      | WS → Query cache patches (M4)                                 |
| Flow state    | Zustand per feature, sessionStorage persist (M2)              |
| Forms         | React Hook Form + Zod resolvers from `entities/*/schema` (M2) |
| URL state     | nuqs (M1)                                                     |
| Local UI      | `useState`                                                    |
| Offline cache | Query persister → IndexedDB, `/me` scope (M5)                 |

Rule: shared client state belongs in the URL or on the server.

## Transport

`shared/api/http.ts` — the only fetch call site. Normalizes all failures to
`AppError{code, retryable, uaMessage}`; retries idempotent GETs only;
auto-attaches Idempotency-Keys to hold/payment creation.

## Architecture gate — `npm run graph`

The layer contract is machine-verified from the real import tree
(`scripts/dep-graph.mjs`, contract in `scripts/dep-graph.config.mjs`).
It fails the build on:

| Rule                   | Meaning                                                |
| ---------------------- | ------------------------------------------------------ |
| `dependency-inversion` | an edge points up the layer ranks                      |
| `illegal-layer-edge`   | edge not in the allow-list for that layer              |
| `cross-slice-import`   | `features/a → features/b` or `entities/a → entities/b` |
| `runtime-cycle`        | cycle among value/side-effect imports                  |

Outputs, uploaded as a CI artifact (`reports/`, git-ignored):

- `reports/dependency-graph.json` — totals, layer edges, slice edges,
  violations, and informational notes.
- `reports/dependency-graph.mmd` — Mermaid diagram of slices by layer.

Nuances the tool encodes deliberately:

- **Type-only imports are not cycles.** TypeScript erases them, so
  `entities/club/model ↔ schema` and `shared/lib/track ↔ track.schemas` are
  reported as notes, not failures.
- **Dynamic imports** are recorded as edges but excluded from cycle analysis
  (they resolve after module evaluation).
- **Widget → widget composition is legal** (ADR-0001) and listed under
  `notes.horizontalWidgetEdges` so review can confirm it stays deliberate.
- Tests, stories and test utilities are excluded — this is the shipped
  architecture, not the toolchain's own graph.

This overlaps with the `eslint-plugin-boundaries` rules on purpose: ESLint
fails the author at edit time, the graph fails the build with whole-repo
evidence. If the two ever disagree, that disagreement is the bug.

## Data access

`entities/club/repository.ts` is the only source of club data (ADR-0004).
It returns domain objects and exposes no transport concepts; the JSON
content adapter is swapped for the API adapter at M2 without touching
consumers. Server-only — never import it from a client component.

## Provider scoping (ADR-0006)

Root layout ships i18n only. `ProductProviders` (Query, tooltips, toasts) is
mounted by product segments from M2; the nuqs adapter is mounted inside the
catalog filters. Marketing pages carry no product runtime.

Client-bundle rules learned the hard way, enforced by `npm run bundle:check`:

- Never export a Zod schema from an entity barrel — client components that
  need the value list import a plain `as const` tuple (`TABLE_TYPES`).
- Import `"use client"` modules by leaf path, not through a barrel.
- `shared/` modules reachable from client code stay dependency-free.

## Cross-cutting (from M0)

- **i18n**: every string through next-intl; `uk` is the only locale.
- **Analytics**: `shared/lib/track.ts`, Zod-schema'd events, pluggable sinks.
- **Flags**: `shared/config/flags.ts`, env-overridable, remote-ready.
- **Money**: integer minor units via `shared/lib/money.ts` — no floats, ever.
- **Env**: Zod-validated at boot.
- **Design tokens**: `shared/styles/globals.css` `@theme` — components use
  Tailwind utilities only; raw hex outside that file is a review failure.

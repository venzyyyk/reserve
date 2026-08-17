# Architecture

Authoritative summary — full rationale in `../MPS.md` §8.

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

# ADR-0003: Self-hosted fonts; Sentry as an optional runtime

**Status:** Accepted (M0)

## Context

Two independent M0 questions, both about what a user is forced to download
and what a build is forced to depend on.

**Fonts.** Cue uses Unbounded (display) and Inter (UI), both needing full
Cyrillic coverage. `next/font/google` fetches font files at build time,
making builds network-dependent and non-deterministic.

**Observability.** MPS §8 requires Sentry from M0, but no DSN exists until
an environment is provisioned, and `@sentry/nextjs` costs roughly 30 KB gz
in the client bundle — on a product whose Lighthouse gate is ≥95.

## Decision

1. Self-host fonts via `@fontsource-variable/{inter,unbounded}` (npm).
2. Do not add `@sentry/nextjs` as a hard dependency. `instrumentation-client.ts`
   dynamically imports it only when `NEXT_PUBLIC_SENTRY_DSN` is set; the
   dependency is installed in the deploy environment alongside the DSN.

## Alternatives considered

| Option                                          | Why not                                                                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `next/font/google`                              | Build-time network fetch; non-deterministic CI; serves from a third party, which is avoidable GDPR surface for a UA consumer product. |
| System font stack                               | Free and fast, but the MPS's entire visual identity rests on Unbounded's display voice. Cheap in bytes, expensive in product.         |
| Sentry as a hard dependency, always initialised | Ships ~30 KB gz to every user before observability is even configured; would consume the M1 homepage budget for zero benefit.         |
| No error reporting until later                  | Leaves the first production incidents unobserved; the whole point of provisioning it at M0 is to have it before it is needed.         |

## Consequences

- Deterministic builds; fonts served from our origin.
- We own `font-display` and fallback metric matching — font-swap CLS is now
  our risk, watched in RUM.
- Sentry costs nothing until a DSN exists; `withSentryConfig` for source-map
  upload is added with the same change.
- Revisit if: RUM shows font-swap CLS we cannot fix with metric overrides,
  or bundle analysis shows the dynamic Sentry import behaving differently
  than expected in production.

## References

MPS §8, §10 · `src/instrumentation-client.ts` · `src/app/layout.tsx`.

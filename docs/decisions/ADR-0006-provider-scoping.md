# ADR-0006: Providers scoped to the segments that need them

**Status:** Accepted (M1a)

## Context

M0 mounted the full provider stack — TanStack Query, Radix tooltips, the
toaster — plus, at M1a, the nuqs URL-state adapter, in the root layout.
That is the conventional Next.js arrangement.

M1a's bundle check measured the result: the homepage first load hit
**149.2 KB gz** against a 100.5 KB M0 baseline. Chunk analysis attributed
the growth to three things reaching pages that never use them:

- ~35 KB gz of product runtime (query client, tooltip primitives, toaster,
  URL-state adapter) from the root provider stack;
- **Zod** on the homepage, because `shared/config/flags.ts` used it and is
  imported by the mobile tab bar, and `shared/lib/track.ts` used it for
  event schemas;
- **nuqs** on the homepage, because the hero imported `QuickSearchForm`
  through the feature barrel, which also re-exports the catalog filters —
  `"use client"` modules are client-reference boundaries and do not
  tree-shake through barrels.

Marketing pages are the Lighthouse-gated surface (MPS §10).

## Decision

The root layout mounts **only** `NextIntlClientProvider`.

- `ProductProviders` (Query + tooltips + toaster) is mounted by product
  segments — flow, player area, admin — from M2.
- The nuqs adapter is mounted inside `CatalogFilters`, the only consumer.
- `shared/config/flags.ts` is dependency-free (hand-rolled validation).
- `shared/lib/track.ts` expresses its contract in TypeScript types; Zod
  validation lives in `track.schemas.ts`, loaded by a development-only
  dynamic import and kept in sync by `satisfies` plus a test.
- Entity barrels do not re-export Zod schemas; client code imports plain
  `as const` tuples (`TABLE_TYPES`).
- `"use client"` modules are imported by leaf path, not through barrels.

## Alternatives considered

| Option                                        | Why not                                                                                                                                                    |
| --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep root providers, raise the budget         | Budgets that move to accommodate regressions are decoration. The weight bought nothing on these routes.                                                    |
| Root providers, rely on tree-shaking          | Empirically false for `"use client"` boundaries — this is precisely how nuqs reached the homepage.                                                         |
| Drop Zod entirely                             | Zod earns its place at the API/form boundary (M2 payments). The fix is scope, not removal.                                                                 |
| Keep Zod in `track.ts`, accept the cost       | Shipping a validation runtime to production so developers get typo protection is paying users for a developer convenience.                                 |
| Move client i18n to server-passed label props | Would remove ~12 KB more, but M2's flow needs client-side formatting (countdowns, live prices) anyway; two i18n mechanisms would cost more than the bytes. |

## Consequences

- Homepage first load fell to **128.2 KB gz** (−21 KB from the peak); the
  remaining delta over M0 is the next-intl client runtime the i18n policy
  requires, plus icons and the hero form.
- New client-reachable modules in `shared/` must justify any runtime
  dependency — now a review checklist item.
- M2 must mount `ProductProviders` in the flow/player/admin layouts.
  Forgetting it fails loudly (Query hooks throw without a provider), so the
  seam is safe rather than silently degrading.
- Revisit if: a public page ever genuinely needs server state, at which
  point Query moves to that segment rather than back to the root.

## References

MPS §8, §10 · `src/providers/product-providers.tsx` · `scripts/bundle-budget.mjs`
· measurements in the M1a milestone report.

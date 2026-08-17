# Architecture Decision Log

Every architectural decision on Reserve is recorded here as an ADR. The log
is append-only: **when a decision changes, write a new ADR that supersedes
the old one — never edit the original.** A superseded ADR stays in the
repository, keeps its number, and gains a pointer forward. The reasoning we
had at the time is evidence; deleting it destroys the ability to ask "why
did we think that, and what changed?"

## Index

| ADR                                      | Title                                                         | Status             | Milestone |
| ---------------------------------------- | ------------------------------------------------------------- | ------------------ | --------- |
| [0001](ADR-0001-layer-boundaries.md)     | Feature-first layers enforced by lint                         | Superseded by 0008 | M0        |
| [0002](ADR-0002-token-naming.md)         | Text tokens named `fg` in the Tailwind theme                  | Accepted           | M0        |
| [0003](ADR-0003-fonts-and-sentry.md)     | Self-hosted fonts; Sentry as an optional runtime              | Accepted           | M0        |
| [0004](ADR-0004-content-repository.md)   | Club data behind a repository interface                       | Accepted           | M1a       |
| [0005](ADR-0005-marketing-motion.md)     | CSS-driven motion on public pages; no hero video yet          | Accepted           | M1a       |
| [0006](ADR-0006-provider-scoping.md)     | Providers scoped to the segments that need them               | Accepted           | M1a       |
| [0007](ADR-0007-architecture-gate.md)    | Architecture verified from the import graph in CI             | Accepted           | M1a       |
| [0008](ADR-0008-entity-relationships.md) | Entities may reference other entities; features stay isolated | Accepted           | M2a       |
| [0009](ADR-0009-booking-atomicity.md)    | Overlap prevention as one atomic document, not a transaction  | Accepted           | M2b       |

## Status lifecycle

| Status         | Meaning                                                                   |
| -------------- | ------------------------------------------------------------------------- |
| **Proposed**   | Written, under discussion. Not yet binding.                               |
| **Accepted**   | Binding. Code and review must follow it.                                  |
| **Superseded** | Replaced by a later ADR. Header links forward; body untouched.            |
| **Deprecated** | No longer applies and nothing replaced it (e.g. the feature was dropped). |

## Writing an ADR

1. Copy [`ADR-TEMPLATE.md`](ADR-TEMPLATE.md) to `ADR-NNNN-short-slug.md`
   using the next free number.
2. Fill in all five sections. **Alternatives considered** is not optional —
   an ADR without rejected options is a description, not a decision.
3. Add a row to the index above.
4. `npm run adr:check` validates format and index consistency (runs in CI).

## Superseding a decision

In the **new** ADR:

```markdown
**Status:** Accepted (M4) · supersedes [ADR-0005](ADR-0005-marketing-motion.md)
```

In the **old** ADR, change only the status line — never the body:

```markdown
**Status:** Superseded by [ADR-0012](ADR-0012-hero-video.md) (M4) · was Accepted (M1a)
```

That single-line edit is the one exception to the append-only rule: it is a
forward pointer, not a rewrite of the reasoning.

## What deserves an ADR

Write one when a choice is **hard to reverse** or **binds future work**:
layer rules, state ownership, data-access seams, auth model, rendering
strategy, payment integration shape, dependency additions with runtime cost,
anything that trades one quality attribute for another.

Do **not** write one for reversible implementation detail — component
internals, copy, spacing, a helper's signature. Those belong in code
comments and the design system.

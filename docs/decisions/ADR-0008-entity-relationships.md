# ADR-0008: Entities may reference other entities; features stay isolated

**Status:** Accepted (M2a) · supersedes [ADR-0001](ADR-0001-layer-boundaries.md)

## Context

ADR-0001 established five layers with downward-only dependencies and added
slice isolation to both `features` and `entities`: `features/a` may not
import `features/b`, and `entities/a` may not import `entities/b`.

At the time the repository had one entity, so the entity half of that rule
was never tested against a real domain. M2a introduced `entities/booking`,
and the rule failed immediately and unambiguously:

- a booking is _for a table in a club_;
- which slots exist derives from the club's opening hours, including the
  cross-midnight handling already implemented and tested in `entities/club`;
- the price of a session derives from the club's table pricing.

Every one of those is a genuine domain relationship, not accidental
coupling. The architecture gate (`npm run graph`) reported five violations
on working, correct code — the signal that the rule, not the code, was
wrong.

## Decision

Entities may import other entities. The dependency must remain acyclic,
which the existing runtime-cycle check already enforces.

**Feature slice isolation is unchanged**: `features/a` may not import
`features/b`; two features meet in a widget. Everything else in ADR-0001 —
the five layers, their ranks, downward-only dependencies, lint enforcement
— carries over unchanged.

## Alternatives considered

| Option                                               | Why not                                                                                                                                                                                                         |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep entities isolated; pass primitives into booking | Every caller would assemble opening windows and prices by hand, and the cross-midnight rule would be re-derived outside the entity that owns it — duplicated domain logic is a worse failure than a dependency. |
| Merge club and booking into one entity               | They have genuinely different lifecycles: clubs are editorial content refreshed hourly, bookings are transactional state. One module would need both, and the ownership boundary would blur.                    |
| Promote the shared parts into `shared/`              | `shared` is for framework-agnostic utilities. Opening hours and pricing are domain rules; putting them there would empty the entity layer of its purpose.                                                       |
| Suppress the lint rule for this import               | The rule would then be advisory, which is the failure mode ADR-0001 exists to prevent. If a rule is wrong, change the rule.                                                                                     |

## Consequences

- `entities/booking` depends on `entities/club`; the graph stays a DAG and
  the cycle check keeps it that way.
- The direction matters: booking knows about clubs, clubs know nothing
  about bookings. A club must remain renderable with no booking system
  present — that is what keeps the catalogue and SEO pages independent.
- Cross-entity dependencies now need review judgement rather than a
  mechanical rule. The graph report lists them, so they stay visible.
- Revisit if: entity dependencies ever form a cycle, or a single entity
  accumulates dependencies on most others — both are signs an aggregate
  boundary is drawn wrong.

## References

`scripts/dep-graph.config.mjs` (`SLICE_ISOLATED`) · `eslint.config.mjs` ·
supersedes the entity-slice half of ADR-0001.

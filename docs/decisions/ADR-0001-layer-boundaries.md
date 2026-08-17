# ADR-0001: Feature-first layers enforced by lint

**Status:** Superseded by [ADR-0008](ADR-0008-entity-relationships.md) (M2a) · was Accepted (M0)

## Context

MPS §8 specifies a feature-first architecture with five layers
(`app → widgets → features → entities → shared`) and downward-only
dependencies. The project is planned across nine milestones with a small
team; the architecture has to survive delivery pressure without a senior
reviewer inspecting every import.

Convention-only architectures decay predictably: the first "just this once"
import is never reverted, and by the third milestone the layer diagram in
the docs describes a system that no longer exists.

## Decision

Five layers with ranked, downward-only dependencies, enforced by
`eslint-plugin-boundaries` in CI. Cross-feature imports are forbidden —
two features may only meet inside a widget. `providers/` is the composition
root and may reach only `shared`.

## Alternatives considered

| Option                                                 | Why not                                                                                                                                          |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Convention + code review                               | Relies on a reviewer noticing every import in every PR; degrades exactly when the team is busiest.                                               |
| Technical layering (`components/`, `hooks/`, `utils/`) | Groups by mechanism instead of by domain; every feature change touches five directories and nothing owns a feature end-to-end.                   |
| Separate packages per layer (monorepo)                 | Real enforcement, but adds build orchestration and versioning overhead a 3-person team does not need at M0. Revisit if the admin app splits out. |
| Nx / module-boundary tooling                           | Heavier toolchain for the same guarantee ESLint already gives us here.                                                                           |

## Consequences

- A violation fails CI with a precise message, so the rule is discussed at
  authoring time rather than argued about in review.
- The lint config _is_ the architecture documentation, and it cannot go
  stale — if it were wrong, the build would be wrong.
- Friction appears when two features want to share code. The resolution
  (promote to `entities`/`shared`, or compose in a widget) is exactly the
  design conversation we want to force.
- Revisit if: a genuine second application appears (admin, club-owner PWA)
  and package-level isolation starts paying for itself.

## References

MPS §8 · `eslint.config.mjs` · enforced a second way by ADR-0007.

# ADR-0007: Architecture verified from the import graph in CI

**Status:** Accepted (M1a)

## Context

ADR-0001 enforces layer boundaries with `eslint-plugin-boundaries`, which
works per file: it answers "may this module import that one?" It cannot
answer questions that are properties of the whole graph — most importantly
**import cycles**, which surface as undefined-at-init bugs that are painful
to diagnose and trivial to detect.

At the end of M1a the layer structure was verified by hand. That analysis
was correct but unrepeatable, and an architecture review that only happens
when someone remembers to ask is not a control.

## Decision

`npm run graph` (`scripts/dep-graph.mjs`) builds the dependency graph from
the real import tree — alias and relative specifiers, classifying edges as
value / type-only / side-effect / dynamic — and fails the build on:

`dependency-inversion` · `illegal-layer-edge` · `cross-slice-import` ·
`runtime-cycle`

It emits `reports/dependency-graph.json` (machine-readable) and
`reports/dependency-graph.mmd` (Mermaid), uploaded as a CI artifact with
`if: always()` so a failing run still produces evidence. The contract lives
in `scripts/dep-graph.config.mjs`. Tests, stories and test utilities are
excluded: this measures shipped architecture.

Two analysis rules are deliberate:

- **Type-only imports are not cycles.** TypeScript erases them, so
  `entities/club/model ↔ schema` and `shared/lib/track ↔ track.schemas` are
  reported as notes, not failures.
- **Dynamic imports** are recorded as edges but excluded from cycle
  analysis; they resolve after module evaluation.

## Alternatives considered

| Option                                 | Why not                                                                                                                                                                                                                                        |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ESLint boundaries alone                | Cannot see cycles; gives no whole-repo artifact for review.                                                                                                                                                                                    |
| `madge` / `dependency-cruiser`         | Capable, but neither understands _our_ layer ranks and slice-isolation rules without substantial config; we would still write the contract, plus own a dependency. `dependency-cruiser` is the sensible migration target if this script grows. |
| Manual review each milestone           | Exactly what M1a did; unrepeatable and easy to skip under deadline.                                                                                                                                                                            |
| Naive cycle detection over all imports | Would flag the two intentional type-only pairs and force a pointless refactor — a false positive that trains people to ignore the tool.                                                                                                        |
| Replace the ESLint rules with this     | Loses the edit-time error with a precise message; CI-only feedback is slower and lands after the work is done.                                                                                                                                 |

## Consequences

- Redundancy with ESLint is intentional and documented: ESLint fails the
  author at edit time, the graph fails the build with whole-repo evidence.
  If the two ever disagree, that disagreement is the bug worth investigating.
- The tool was validated by injecting each violation class into a scratch
  copy and confirming a non-zero exit — a gate never seen failing is not a
  gate. On its first real run it exposed a bug in itself (content files
  outside `src/` being assigned a layer), which was fixed.
- The contract is a config file, so M2's new layers/slices are a data change.
- Revisit if: the script grows beyond roughly its current size, at which
  point `dependency-cruiser` with our rules is the cheaper option.

## References

`scripts/dep-graph.mjs` · `scripts/dep-graph.config.mjs` ·
`.github/workflows/ci.yml` · builds on ADR-0001.

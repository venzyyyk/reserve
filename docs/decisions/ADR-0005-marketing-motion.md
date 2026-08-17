# ADR-0005: CSS-driven motion on public pages; no hero video at M1a

**Status:** Accepted (M1a)

## Context

MPS §6 specifies a cinematic hero with a video loop, and MPS §3 defines a
motion vocabulary built on `motion` (Framer). MPS §10 simultaneously sets
the gate the homepage must clear: Lighthouse ≥95, LCP < 2 s, CLS < 0.05.

Measured facts at M1a: the `motion` runtime costs roughly 30 KB gz; the
entire interactive surface of the homepage is two `<select>` elements and a
submit button; the M0 baseline first load was 100.5 KB gz. We also have no
real venue footage — only stock video would be available.

## Decision

1. Public marketing surfaces animate with `Reveal`, an IntersectionObserver
   - CSS-transition component (~0.4 KB). `Rise`/`Stagger` (motion) remain
     for the booking flow and dashboards from M2.
2. The hero ships a CSS-composited cinematic layer (felt radial, lamp pool,
   vignette) instead of the video loop.

## Alternatives considered

| Option                                              | Why not                                                                                                                     |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Ship `motion` on public pages                       | ~30 KB gz to produce "rise + fade on scroll" — the definition of unjustified weight on the page the perf gate measures.     |
| `LazyMotion` / partial motion imports               | Reduces but does not remove the cost, and adds a second mental model for the same trivial effect.                           |
| Scroll-driven CSS animations (`animation-timeline`) | Not supported broadly enough for a UA audience with a long tail of older Android browsers.                                  |
| No entrance animation at all                        | Cheapest, but the premium feel that justifies this product's positioning is largely carried by motion.                      |
| Ship stock hero video                               | Worse than nothing: it would make Reserve look like every other booking site, while costing ~1.5 MB against the LCP budget. |

## Consequences

- Two motion systems coexist. The boundary is simple and documented:
  public = `Reveal`, product = `motion`.
- `Reveal` respects `prefers-reduced-motion` by rendering visible
  immediately, with no transition.
- The MPS §6 hero video is **deferred, not cancelled**. The poster-first,
  `save-data`-aware rules are already written and wait for real footage.
- Revisit when: a partner club provides usable footage (hero video), or the
  first heavily interactive public surface appears (motion on public pages).

## References

MPS §3, §6, §10 · `src/shared/ui/motion/reveal.tsx` · `scripts/bundle-budget.mjs`.

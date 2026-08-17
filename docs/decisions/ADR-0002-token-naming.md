# ADR-0002: Text tokens named `fg` in the Tailwind theme

**Status:** Accepted (M0)

## Context

The Cue design system (MPS §3) defines text colours as `--text`,
`--text-2`, `--text-3`. Tailwind v4 derives utility names from theme colour
names, so a colour called `text-2` produces the utility `text-text-2`, which
sits next to the typography utilities `text-body`, `text-label`,
`text-caption`. A line reading `text-body text-text-2` is parsed wrong by
humans on first read, every time.

## Decision

Map the MPS text tokens to Tailwind colours named `fg`, `fg-2`, `fg-3`
(`--color-fg*` in `globals.css`). Every other token name carries over from
the MPS unchanged. The MPS remains the semantic source of truth; this is a
code-ergonomics mapping at the theme boundary only.

## Alternatives considered

| Option                                          | Why not                                                                                                                                                     |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Keep `text-*` names verbatim                    | Produces `text-text-2`; collides visually with the type scale and invites mistakes in every component.                                                      |
| Rename the tokens in the MPS too                | The MPS is a cross-functional document; `--text` is the right name in a design conversation. Renaming it to satisfy a CSS framework inverts the dependency. |
| Use CSS variables directly, no Tailwind colours | Loses opacity modifiers (`text-fg/20`) and the utility ergonomics the rest of the system depends on.                                                        |

## Consequences

- Components read unambiguously: `text-body text-fg-2`.
- One indirection exists between the MPS vocabulary and the code
  vocabulary; it is documented here and in `globals.css`, and applies to
  exactly three tokens.
- Revisit if: Tailwind ever namespaces theme colours separately from
  typography utilities, removing the collision.

## References

MPS §3 · `src/shared/styles/globals.css` (`@theme`).

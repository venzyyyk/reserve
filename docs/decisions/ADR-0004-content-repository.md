# ADR-0004: Club data behind a repository interface

**Status:** Accepted (M1a)

## Context

M1a ships the catalog and per-city SEO landings. Those pages must be
statically rendered (ISR) for the Lighthouse and SEO gates, and they must
ship months before the backend exists — the roadmap puts the API at M2a,
deliberately behind the marketing surface.

The data itself is real editorial content (five clubs, actual addresses,
prices in kopiykas, opening hours with cross-midnight windows), not
placeholder text, because the content shape is what the CMS will export.

## Decision

Define `ClubRepository` in `entities/club/repository.ts` with
`all / byCity / bySlug / featured`, returning domain `Club` objects. The
M1a implementation reads a Zod-validated JSON content file; an API adapter
replaces it at M2 without touching any consumer.

The interface exposes **no transport concepts** — no fetch, no response
envelopes, no pagination cursors, no HTTP errors. Translating API payloads
into domain models is the adapter's job.

## Alternatives considered

| Option                                 | Why not                                                                                                                                       |
| -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Call `http()` directly from pages      | There is no service to call; it would mean mocks in production code and rewriting every page at M2.                                           |
| Import the JSON directly in pages      | Ties every page to a storage format. Swapping to the API becomes a change in N pages instead of one module.                                   |
| Stand up the backend first             | Inverts the roadmap: SEO surface and content pipeline would wait on booking infrastructure, delaying the only thing M1 can validate — demand. |
| Repository returning DTOs (API shapes) | Leaks transport into the domain; every consumer would need to know which fields are optional because of the wire format.                      |

## Consequences

- Content errors fail the **build**, not a request: the schema is parsed at
  module init.
- `repository.ts` is server-only. A client component importing it is a
  review failure — verified in M1a's bundle audit.
- The same seam explains a product decision: because clubs onboard before
  their photography does, `ClubCard` ships a _designed_ no-photo cover
  (accent-hue gradient + monogram) rather than a broken-image state.
- Revisit when: the API lands at M2 (adapter swap), or content outgrows a
  single file and needs a real CMS reader.

## References

MPS §2, §8 · `src/entities/club/repository.ts` · `src/entities/club/schema.ts`.

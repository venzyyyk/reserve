# ADR-0009: Overlap prevention as one atomic document, not a transaction

**Status:** Accepted (M2b)

## Context

M2b replaces the in-memory repositories with MongoDB. Everything else in
that migration is mechanical; one thing is not.

The invariant the product depends on is:

> No two live occupancies may overlap on the same club, table and date.

An occupancy is a live hold, a booking awaiting payment, or a confirmed
booking. The in-memory adapter enforced this with a process-wide mutex —
`hold()` read availability and wrote the hold inside one lock, so two
people tapping the same slot could not both win. A mutex in one Node
process is not a guarantee once state is shared: two server instances, or
two `next dev` workers, each hold their own lock and neither excludes the
other. The database has to be what says no.

MongoDB cannot express this invariant as an index. A unique index on
`(club, table, date, start)` rejects two bookings starting at 19:00 and
does nothing about 19:00–21:00 against 20:00–22:00, which is the case that
actually loses a table. Overlap is a range predicate, and no B-tree key
encodes it.

The chaos review at M2a established behaviours that must survive this
migration unchanged: idempotent holds, a fresh payment window on reserve,
duplicate webhooks confirming once, late payments confirming when the slot
is still free and requiring a refund when it is not, and identity-based
(not shape-based) exclusion of a booking from its own availability check.

## Decision

Occupancy lives in one document per `(clubId, tableId, date)` in a
`tableDays` collection, and that document is both the concurrency guard and
the source of truth for availability:

```
{ _id: "clb_x|russian-1|2026-08-02",
  clubId, tableId, date,
  ranges: [ { ref, kind, start, end, until } ] }
```

`ref` is the hold or booking id. `until` is when the claim stops blocking:
now + `HOLD_TTL_MS` for a hold, now + `PAYMENT_WINDOW_MS` once payment
starts, and a far-future sentinel once confirmed.

Claiming a range is a single conditional update:

```js
updateOne(
  {
    _id: key,
    ranges: {
      $not: {
        $elemMatch: {
          start: { $lt: end },
          end: { $gt: start },
          until: { $gt: now },
          ...(exceptRef && { ref: { $ne: exceptRef } }),
        },
      },
    },
  },
  { $push: { ranges: claim }, $setOnInsert: { clubId, tableId, date } },
  { upsert: true },
);
```

MongoDB guarantees single-document atomicity, so the read (`$not
$elemMatch`) and the write (`$push`) cannot interleave with another
claim on the same table and day. `matchedCount + upsertedCount === 0`
means someone was faster. Two concurrent claims on the same slot: one
matches and pushes, the other finds its own predicate false and loses.
Concurrent upserts of the same `_id` collide on the unique `_id` index;
the loser retries once and then sees the winner's range.

`until` is what makes expiry work without a sweeper: a lapsed hold stops
matching the predicate the moment it expires, so the slot is free
immediately rather than when some cleaner runs. Expired entries are pulled
lazily, and correctness never depends on that having happened.

`exceptRef` is how `markPaid` re-checks a late payment: "is anything
_other than this booking_ blocking the slot?" — the identity-based
exclusion from the M2a chaos review, expressed directly in the query.

Domain records still live in their own collections (`bookings`,
`bookingHolds`) and carry the full objects. The ledger carries only what
blocking needs.

## Alternatives considered

| Option                                                                   | Why not                                                                                                                                                                                                                                                                                                                                                                                                 |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multi-document transaction: read availability, insert booking, commit    | Requires a replica set — every developer would need `mongod --replSet` plus `rs.initiate()` before the app runs, and a plain local `mongod` or a shared standalone instance would fail at runtime rather than at setup. Also slower, and still needs a conflict rule: snapshot isolation does not stop two transactions inserting non-conflicting documents that happen to describe overlapping ranges. |
| Unique index on `(clubId, tableId, date, start)`                         | Catches identical start times only. 19:00–21:00 and 20:00–22:00 both insert cleanly and the table is double-booked. It looks like a guarantee, which is worse than having none.                                                                                                                                                                                                                         |
| Slot decomposition: one document per 30-minute slot, unique index on it  | Correct on uniqueness, but a range spans several slots and `insertMany` is not atomic across documents — a partial claim needs compensating deletes, and the rollback window is exactly when two people are racing. Releasing a hold also needs the documents gone immediately, and a TTL index runs about once a minute, so a cancelled hold would block its table for up to a minute.                 |
| Keep the application-level mutex, trust it                               | It is a single-process lock. It survives neither a second instance nor the dev server's own recompilation, which is precisely the class of bug M2b exists to remove.                                                                                                                                                                                                                                    |
| Optimistic concurrency: version field on a club-day document, retry loop | Equivalent safety, more moving parts, and contention is per club-day rather than per claim — a busy club would retry constantly. The conditional update expresses the same thing in one round trip.                                                                                                                                                                                                     |

## Consequences

- The adapter works unchanged on a standalone `mongod`, a replica set and
  Atlas. Local setup is `docker compose up -d mongodb` with no replica-set
  initiation step.
- Availability for a club and date is one indexed query
  (`{ clubId: 1, date: 1 }`) returning at most one document per table, not
  a scan of bookings. No N+1.
- The ledger and the domain records are two writes, in that order: claim
  first, then write the record. A crash between them leaves a range with no
  record behind it, which expires on its own within the hold or payment
  window. A crash cannot produce the opposite — a booking nothing is
  holding — which is the direction that would double-book.
- `ranges` grows with the day's activity for one table and is pulled of
  dead entries on write. If a table ever accumulates enough claims for the
  16 MB document limit to matter, the key is already `(club, table, date)`
  and can be split further; at roughly 30 claims a day it is not close.
- Revisit if: bookings ever span more than one day per document key, or the
  product introduces a claim that must block across tables — neither is
  expressible in a per-table document, and that is when transactions become
  the right answer.

## References

`src/entities/booking/repository.mongo.ts` ·
`src/shared/db/collections.ts` (indexes) ·
`src/entities/booking/__tests__/concurrency.mongo.test.ts` ·
builds on [ADR-0004](ADR-0004-content-repository.md) (repository seam).

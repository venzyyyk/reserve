import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type { Occupancy } from "./model";

/**
 * The occupancy ledger: one document per club/table/date, holding every
 * claim on that table that day. It is both the concurrency guard and the
 * source of truth for availability (ADR-0009).
 *
 * Nothing outside this module and the Mongo booking adapter knows the
 * shape — callers deal in `Occupancy`, which is a domain type.
 */
export type ClaimKind = "hold" | "awaiting_payment" | "confirmed";

interface RangeClaim {
  /** Hold id or booking id — what owns this claim. */
  ref: string;
  kind: ClaimKind;
  start: number;
  end: number;
  /** When the claim stops blocking. Confirmed claims use CONFIRMED_UNTIL. */
  until: Date;
}

interface TableDay {
  _id: string;
  clubId: string;
  tableId: string;
  date: string;
  ranges: RangeClaim[];
}

/**
 * A confirmed booking blocks until long after anyone will ask. Using a
 * date rather than `null` keeps the blocking predicate a single
 * comparison, which is what makes the claim query one atomic step.
 */
export const CONFIRMED_UNTIL = new Date("9999-12-31T00:00:00.000Z");

const keyOf = (clubId: string, tableId: string, date: string): string =>
  `${clubId}|${tableId}|${date}`;

/**
 * Claims a range, or reports that something else holds it.
 *
 * The filter and the write are one document update, so two concurrent
 * claims on the same slot cannot both succeed: whichever runs second finds
 * its own precondition false.
 *
 * `exceptRef` excludes one claim from the overlap check by identity — used
 * when a booking re-checks whether *anything else* took its slot while its
 * payment was in flight.
 */
export async function claimRange(input: {
  clubId: string;
  tableId: string;
  date: string;
  start: number;
  end: number;
  ref: string;
  kind: ClaimKind;
  until: Date;
  now: Date;
  exceptRef?: string;
}): Promise<boolean> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  const _id = keyOf(input.clubId, input.tableId, input.date);

  const blocking = {
    start: { $lt: input.end },
    end: { $gt: input.start },
    until: { $gt: input.now },
    ...(input.exceptRef !== undefined && { ref: { $ne: input.exceptRef } }),
  };

  const claim: RangeClaim = {
    ref: input.ref,
    kind: input.kind,
    start: input.start,
    end: input.end,
    until: input.until,
  };

  try {
    const result = await days.updateOne(
      { _id, ranges: { $not: { $elemMatch: blocking } } },
      {
        $push: { ranges: claim },
        $setOnInsert: {
          clubId: input.clubId,
          tableId: input.tableId,
          date: input.date,
        },
      },
      { upsert: true },
    );
    return result.matchedCount > 0 || result.upsertedCount > 0;
  } catch (error) {
    // Two claims for a table's first booking of the day race to upsert the
    // same _id; the loser gets a duplicate key. The document now exists, so
    // one retry either claims it or correctly finds the slot taken.
    if (isDuplicateKey(error)) {
      const retry = await days.updateOne(
        { _id, ranges: { $not: { $elemMatch: blocking } } },
        { $push: { ranges: claim } },
      );
      return retry.matchedCount > 0;
    }
    throw error;
  }
}

/**
 * Moves an existing claim to a new kind and expiry — a hold becoming a
 * booking, a booking becoming confirmed. Returns false if the claim is
 * gone, which means it lapsed and something else may now own the slot.
 */
export async function retagClaim(input: {
  clubId: string;
  tableId: string;
  date: string;
  ref: string;
  newRef?: string;
  kind: ClaimKind;
  until: Date;
  /** Only a claim that is still blocking may be extended. */
  now: Date;
}): Promise<boolean> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  const result = await days.updateOne(
    { _id: keyOf(input.clubId, input.tableId, input.date) },
    {
      $set: {
        "ranges.$[claim].kind": input.kind,
        "ranges.$[claim].until": input.until,
        ...(input.newRef !== undefined && {
          "ranges.$[claim].ref": input.newRef,
        }),
      },
    },
    {
      // The liveness condition is what stops a dead claim being resurrected.
      // Without it, an expired hold whose slot someone else has since taken
      // could be given a fresh window and the table would be sold twice.
      arrayFilters: [
        { "claim.ref": input.ref, "claim.until": { $gt: input.now } },
      ],
    },
  );
  return result.modifiedCount > 0;
}

/** Drops a claim outright — a released hold, a cancelled booking. */
export async function releaseClaim(input: {
  clubId: string;
  tableId: string;
  date: string;
  ref: string;
}): Promise<void> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  await days.updateOne(
    { _id: keyOf(input.clubId, input.tableId, input.date) },
    { $pull: { ranges: { ref: input.ref } } },
  );
}

/**
 * Everything blocking tables at a club on a date, right now.
 *
 * One indexed query returning at most one document per table. Expired
 * claims are filtered here rather than deleted, so availability is correct
 * the instant a hold lapses instead of whenever a cleaner next runs.
 */
export async function occupancyFor(
  clubId: string,
  date: string,
  now: Date,
): Promise<Occupancy[]> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  const documents = await days
    .find(
      { clubId, date },
      { projection: { _id: 0, tableId: 1, date: 1, ranges: 1 } },
    )
    .toArray();

  return documents.flatMap((day) =>
    day.ranges
      .filter((claim) => claim.until > now)
      .map((claim) => ({
        tableId: day.tableId,
        date: day.date,
        start: claim.start,
        end: claim.end,
      })),
  );
}

/**
 * Best-effort removal of claims that stopped blocking. Correctness never
 * depends on this having run — the blocking predicate already ignores
 * them; it only keeps documents from growing without bound.
 */
export async function pruneExpired(
  clubId: string,
  date: string,
  now: Date,
): Promise<void> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  await days.updateMany(
    { clubId, date },
    { $pull: { ranges: { until: { $lte: now } } } },
  );
}

/** Test seam. */
export async function clearLedger(): Promise<void> {
  const days = await collection<TableDay>(COLLECTIONS.tableDays);
  await days.deleteMany({});
}

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

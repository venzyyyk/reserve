import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type { ApplicationStatus, ClubApplication } from "./model";
import type { ApplicationInput } from "./schema";
import type { ApplicationRepository } from "./ports";

/**
 * MongoDB club-application adapter.
 *
 * Approving an application records a decision; it does not create a club.
 * That was true before M2b and stays true — onboarding a club means
 * photographs, opening hours and a floor plan, none of which a form has.
 */
const applications = () =>
  collection<ClubApplication>(COLLECTIONS.clubApplications);
const withoutId = { projection: { _id: 0 } } as const;

export const mongoApplicationRepository: ApplicationRepository = {
  async list(status?: ApplicationStatus) {
    const documents = await applications();
    return documents
      .find(status ? { status } : {}, withoutId)
      .sort({ createdAt: -1 })
      .toArray();
  },

  async create(input: ApplicationInput) {
    const documents = await applications();
    const application: ClubApplication = {
      id: `app_${crypto.randomUUID().slice(0, 8)}`,
      status: "pending",
      createdAt: new Date().toISOString(),
      ...input,
    };
    await documents.insertOne({ ...application });
    return application;
  },

  async decide(
    id: string,
    status: Exclude<ApplicationStatus, "pending">,
    note?: string,
  ) {
    const documents = await applications();
    const trimmed = note?.trim();

    // "Only if still pending" is part of the filter, so a double-clicked
    // approve cannot be overtaken by a reject: decisions are one-way.
    const decided = await documents.findOneAndUpdate(
      { id, status: "pending" },
      {
        $set: {
          status,
          decidedAt: new Date().toISOString(),
          ...(trimmed ? { decisionNote: trimmed } : {}),
        },
      },
      { returnDocument: "after", ...withoutId },
    );
    if (decided) return decided;

    // Either it does not exist, or it was already answered — return the
    // answer on file rather than a misleading null.
    const existing = await documents.findOne({ id }, withoutId);
    return existing ?? null;
  },

  async countPending() {
    const documents = await applications();
    return documents.countDocuments({ status: "pending" });
  },
};

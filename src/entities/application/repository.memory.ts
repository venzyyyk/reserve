import "server-only";

import { processMap, processMutex } from "@/shared/lib/process-store";

import type { ApplicationStatus, ClubApplication } from "./model";
import type { ApplicationInput } from "./schema";
import type { ApplicationRepository } from "./ports";

/** Applications live behind the same repository seam as everything else. */

const exclusive = processMutex("applications");

/** Seeded so the review queue is never an empty screen in a demo. */
const seeded: ClubApplication[] = [
  {
    id: "app_seed_1",
    clubName: "Дуплет",
    citySlug: "kharkiv",
    contactName: "Андрій Гончар",
    phone: "+380501234567",
    email: "duplet.kh@example.com",
    tableCount: 7,
    planId: "plan_vip",
    message: "Працюємо 6 років, хочемо приймати броні онлайн.",
    status: "pending",
    createdAt: new Date(Date.now() - 36 * 3600_000).toISOString(),
  },
  {
    id: "app_seed_2",
    clubName: "Кий і Куля",
    citySlug: "dnipro",
    contactName: "Марина Левченко",
    phone: "+380671112233",
    tableCount: 4,
    planId: "plan_basic",
    status: "pending",
    createdAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
  },
];
const applications = processMap<ClubApplication>("applications", () =>
  seeded.map((application) => [application.id, application] as const),
);

/** Development and unit-test adapter. */
export const memoryApplicationRepository: ApplicationRepository = {
  async list(status?: ApplicationStatus): Promise<ClubApplication[]> {
    return exclusive(() =>
      [...applications.values()]
        .filter((application) => !status || application.status === status)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    );
  },

  async create(input: ApplicationInput): Promise<ClubApplication> {
    return exclusive(() => {
      const application: ClubApplication = {
        id: `app_${crypto.randomUUID().slice(0, 8)}`,
        status: "pending",
        createdAt: new Date().toISOString(),
        ...input,
      };
      applications.set(application.id, application);
      return application;
    });
  },

  /**
   * Decisions are one-way: an application that has been answered keeps its
   * answer, so a double-clicked approve cannot flip to rejected.
   */
  async decide(
    id: string,
    status: Exclude<ApplicationStatus, "pending">,
    note?: string,
  ): Promise<ClubApplication | null> {
    return exclusive(() => {
      const application = applications.get(id);
      if (!application) return null;
      if (application.status !== "pending") return application;

      const decided: ClubApplication = {
        ...application,
        status,
        decidedAt: new Date().toISOString(),
        ...(note?.trim() ? { decisionNote: note.trim() } : {}),
      };
      applications.set(id, decided);
      return decided;
    });
  },

  async countPending(): Promise<number> {
    return exclusive(
      () =>
        [...applications.values()].filter(
          (application) => application.status === "pending",
        ).length,
    );
  },
};

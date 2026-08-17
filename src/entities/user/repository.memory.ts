import "server-only";

import { processMap, processMutex } from "@/shared/lib/process-store";

import type { PlatformUser, UserRole } from "./index";
import type { UserRepository } from "./ports";

const exclusive = processMutex("users");

const seeded: PlatformUser[] = [
  {
    id: "usr_1",
    phone: "+380671234567",
    name: "Олег Ковальчук",
    role: "guest",
    blocked: false,
    bookingsCount: 6,
    createdAt: new Date(Date.now() - 40 * 86_400_000).toISOString(),
  },
  {
    id: "usr_2",
    phone: "+380442001234",
    name: "Володимир, «Класик»",
    role: "club_owner",
    blocked: false,
    bookingsCount: 0,
    clubId: "clb_kyiv_klasyk",
    createdAt: new Date(Date.now() - 120 * 86_400_000).toISOString(),
  },
  {
    id: "usr_3",
    phone: "+380990000000",
    role: "guest",
    blocked: true,
    bookingsCount: 11,
    createdAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
  },
];
const users = processMap<PlatformUser>("users", () =>
  seeded.map((user) => [user.id, user] as const),
);

/** Development and unit-test adapter. Seeds live here, not in MongoDB. */
export const memoryUserRepository: UserRepository = {
  async list(): Promise<PlatformUser[]> {
    return exclusive(() =>
      [...users.values()].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      ),
    );
  },

  async setBlocked(id: string, blocked: boolean): Promise<PlatformUser | null> {
    return exclusive(() => {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, blocked };
      users.set(id, updated);
      return updated;
    });
  },

  async setRole(id: string, role: UserRole): Promise<PlatformUser | null> {
    return exclusive(() => {
      const user = users.get(id);
      if (!user) return null;
      const updated = { ...user, role };
      users.set(id, updated);
      return updated;
    });
  },

  async count(): Promise<number> {
    return exclusive(() => users.size);
  },
};

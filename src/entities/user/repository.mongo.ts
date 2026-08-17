import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type { PlatformUser, UserRole } from "./index";
import type { UserRepository } from "./ports";

/**
 * MongoDB user adapter.
 *
 * M2b makes the existing user model durable and nothing more: booking is
 * still guest-first, there is still no password, and OTP delivery is still
 * unimplemented. Building an authentication system here would be new
 * product hiding inside a migration.
 */
const users = () => collection<PlatformUser>(COLLECTIONS.users);

/** `_id` never leaves the data layer. */
const withoutId = { projection: { _id: 0 } } as const;

export const mongoUserRepository: UserRepository = {
  async list() {
    const documents = await users();
    return documents.find({}, withoutId).sort({ createdAt: -1 }).toArray();
  },

  async setBlocked(id: string, blocked: boolean) {
    const documents = await users();
    return documents.findOneAndUpdate(
      { id },
      { $set: { blocked } },
      { returnDocument: "after", ...withoutId },
    );
  },

  async setRole(id: string, role: UserRole) {
    const documents = await users();
    return documents.findOneAndUpdate(
      { id },
      { $set: { role } },
      { returnDocument: "after", ...withoutId },
    );
  },

  async count() {
    const documents = await users();
    return documents.countDocuments();
  },
};

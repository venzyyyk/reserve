import type { PlatformUser, UserRole } from "./index";

/** Unchanged by M2b — the memory and MongoDB adapters both satisfy it. */
export interface UserRepository {
  list(): Promise<PlatformUser[]>;
  setBlocked(id: string, blocked: boolean): Promise<PlatformUser | null>;
  setRole(id: string, role: UserRole): Promise<PlatformUser | null>;
  count(): Promise<number>;
}

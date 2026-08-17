import type { ApplicationStatus, ClubApplication } from "./model";
import type { ApplicationInput } from "./schema";

/** Unchanged by M2b — the memory and MongoDB adapters both satisfy it. */
export interface ApplicationRepository {
  list(status?: ApplicationStatus): Promise<ClubApplication[]>;
  create(input: ApplicationInput): Promise<ClubApplication>;
  decide(
    id: string,
    status: Exclude<ApplicationStatus, "pending">,
    note?: string,
  ): Promise<ClubApplication | null>;
  countPending(): Promise<number>;
}

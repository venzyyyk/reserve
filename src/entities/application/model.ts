/** A club asking to join the platform. Created by the public apply form. */
export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface ClubApplication {
  id: string;
  clubName: string;
  citySlug: string;
  contactName: string;
  phone: string;
  email?: string;
  tableCount: number;
  /** Which plan they asked for — a sales signal, not a commitment. */
  planId: string;
  message?: string;
  status: ApplicationStatus;
  createdAt: string;
  decidedAt?: string;
  /** Why it was rejected. Shown to the club, so it is written for them. */
  decisionNote?: string;
}

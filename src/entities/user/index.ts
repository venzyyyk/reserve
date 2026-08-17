/**
 * Platform users. Booking works without an account (MPS §4), so a "user"
 * here is simply a phone number the platform has seen, plus whatever role
 * it has been granted.
 */
export type UserRole = "guest" | "club_owner" | "super_admin";

export interface PlatformUser {
  id: string;
  phone: string;
  name?: string;
  role: UserRole;
  /** Blocked users cannot hold tables or leave reviews. */
  blocked: boolean;
  bookingsCount: number;
  createdAt: string;
  /** Present for club owners — which club they administer. */
  clubId?: string;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  guest: "Гість",
  club_owner: "Власник клубу",
  super_admin: "Супер-адмін",
};

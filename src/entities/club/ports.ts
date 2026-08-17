import type { Club } from "./model";

/**
 * The club repository.
 *
 * The read half is unchanged from ADR-0004 and still means "what the public
 * may see": every read here filters out drafts, because a page that
 * remembers to filter is a page that will one day forget. Admin screens use
 * the explicit `allIncludingDrafts`.
 *
 * The write half arrives with M6. Until then a club was a JSON file and a
 * deploy, which is survivable for four clubs and not for forty.
 */
export interface ClubRepository {
  /** Published clubs only. */
  all(): Promise<Club[]>;
  byCity(citySlug: string): Promise<Club[]>;
  bySlug(citySlug: string, slug: string): Promise<Club | undefined>;
  /** Lookup by stable id — bookings reference clubs this way, not by slug. */
  byId(id: string): Promise<Club | undefined>;
  featured(): Promise<Club[]>;

  /** Everything, drafts included. Admin only. */
  allIncludingDrafts(): Promise<Club[]>;
  /** Admin lookup that can see a draft. */
  byIdIncludingDrafts(id: string): Promise<Club | undefined>;

  /** Creates or replaces a club. The id decides which. */
  save(club: Club): Promise<Club>;
  remove(id: string): Promise<void>;
}

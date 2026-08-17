import { processMap } from "@/shared/lib/process-store";
import { isVisible, type Club } from "./model";
import type { ClubRepository } from "./ports";
import { clubsFileSchema } from "./schema";
import rawClubs from "./content/clubs.uk.json";

/**
 * In-memory club adapter, seeded from the content file.
 *
 * The JSON is still the source for development and tests — validated once,
 * so malformed content fails the build rather than a page. Edits made in
 * the admin panel apply on top of it and last until the process restarts,
 * which is the same bargain every other memory adapter makes.
 */
const clubs = processMap<Club>("clubs", () =>
  clubsFileSchema.parse(rawClubs).map((club) => [club.id, club] as const),
);

const published = (): Club[] => [...clubs.values()].filter(isVisible);

export const memoryClubRepository: ClubRepository = {
  async all() {
    return published();
  },

  async byCity(citySlug) {
    return published().filter((club) => club.city === citySlug);
  },

  async bySlug(citySlug, slug) {
    return published().find(
      (club) => club.city === citySlug && club.slug === slug,
    );
  },

  async byId(id) {
    const club = clubs.get(id);
    return club && isVisible(club) ? club : undefined;
  },

  async featured() {
    return published().filter((club) => club.featured);
  },

  async allIncludingDrafts() {
    return [...clubs.values()];
  },

  async byIdIncludingDrafts(id) {
    return clubs.get(id);
  },

  async save(club) {
    clubs.set(club.id, club);
    return club;
  },

  async remove(id) {
    clubs.delete(id);
  },
};

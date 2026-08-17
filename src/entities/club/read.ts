import "server-only";

import type { Club } from "./model";
import { clubRepository } from "./repository";

/**
 * The clubs to prerender at build time, or none if the database is not
 * reachable from the build machine.
 *
 * Since M6 a club is a database row, and a club created in the panel at
 * three in the afternoon cannot have been prerendered that morning — so
 * every club page is generated on demand and cached anyway (`dynamicParams`
 * plus the on-demand revalidation `saveClub` performs). Prerendering is
 * therefore an optimisation for the clubs that already exist, not a
 * requirement, and a build with no database produces a working site whose
 * pages are simply built on their first visit.
 */
export async function clubsForStaticParams(): Promise<Club[]> {
  try {
    return await clubRepository.all();
  } catch (error) {
    console.warn(
      "clubs: prerendering skipped, pages will build on first request",
      error instanceof Error ? error.name : "Error",
    );
    return [];
  }
}

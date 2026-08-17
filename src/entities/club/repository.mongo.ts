import "server-only";

import { COLLECTIONS, collection } from "@/shared/db/collections";
import type { Club } from "./model";
import type { ClubRepository } from "./ports";

/**
 * MongoDB club adapter (M6).
 *
 * Clubs stop being a content file and become rows an operator can edit,
 * which is what makes onboarding a club a phone call rather than a deploy.
 * The shape is the same validated `Club` — the schema is still the contract,
 * it is simply stored somewhere a form can reach.
 */
const clubs = () => collection<Club>(COLLECTIONS.clubs);
const withoutId = { projection: { _id: 0 } } as const;

/** Drafts are invisible to every public read, by construction. */
const visible = { published: { $ne: false } } as const;

export const mongoClubRepository: ClubRepository = {
  async all() {
    const documents = await clubs();
    return documents.find(visible, withoutId).sort({ name: 1 }).toArray();
  },

  async byCity(citySlug) {
    const documents = await clubs();
    return documents
      .find({ ...visible, city: citySlug }, withoutId)
      .sort({ name: 1 })
      .toArray();
  },

  async bySlug(citySlug, slug) {
    const documents = await clubs();
    const found = await documents.findOne(
      { ...visible, city: citySlug, slug },
      withoutId,
    );
    return found ?? undefined;
  },

  async byId(id) {
    const documents = await clubs();
    const found = await documents.findOne({ ...visible, id }, withoutId);
    return found ?? undefined;
  },

  async featured() {
    const documents = await clubs();
    return documents
      .find({ ...visible, featured: true }, withoutId)
      .sort({ name: 1 })
      .toArray();
  },

  async allIncludingDrafts() {
    const documents = await clubs();
    // Drafts first: they are the ones with work outstanding.
    return documents
      .find({}, withoutId)
      .sort({ published: 1, name: 1 })
      .toArray();
  },

  async byIdIncludingDrafts(id) {
    const documents = await clubs();
    const found = await documents.findOne({ id }, withoutId);
    return found ?? undefined;
  },

  async save(club) {
    const documents = await clubs();
    await documents.replaceOne({ id: club.id }, club, { upsert: true });
    return club;
  },

  async remove(id) {
    const documents = await clubs();
    await documents.deleteOne({ id });
  },
};

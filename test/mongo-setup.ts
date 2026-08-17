import { afterAll, beforeAll } from "vitest";

/**
 * Points the suite at a real MongoDB before any module reads the
 * environment, and refuses to run without one.
 *
 * Skipping when the database is missing would be worse than failing: a
 * green run would then mean "the integration tests did not execute", which
 * is exactly the reassurance nobody wants from a persistence suite.
 */
const uri = process.env.MONGODB_URI;

if (!uri) {
  throw new Error(
    "MONGODB_URI is required for the MongoDB suite.\n" +
      "  docker compose up -d mongodb\n" +
      "  MONGODB_URI=mongodb://localhost:27017 npm run test:mongo",
  );
}

// Never the database the developer is also using by hand.
const base = process.env.MONGODB_DB_NAME ?? "reserve";
process.env.MONGODB_DB_NAME = base.endsWith("_test") ? base : `${base}_test`;

beforeAll(async () => {
  const { ensureIndexes } = await import("@/shared/db/collections");
  await ensureIndexes();
});

afterAll(async () => {
  const { closeMongo } = await import("@/shared/db/client");
  await closeMongo();
});

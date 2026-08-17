#!/usr/bin/env node
/**
 * Development seed.
 *
 * Populates enough of MongoDB to reproduce the application as it behaves on
 * the in-memory adapter: clubs come from content files at runtime, so what
 * needs seeding is the commercial and social state — billing plans, a
 * placement, a promotion, users, club applications and reviews.
 *
 * Two safety rules, both deliberate:
 *
 *   1. It refuses to run when NODE_ENV=production unless --force is passed.
 *      A seed that ran on production would rewrite an operator's prices.
 *   2. Without --reset it only inserts what is missing. Running it twice
 *      changes nothing the second time.
 *
 * Usage:
 *   npm run seed              # fill in what is missing
 *   npm run seed -- --reset   # wipe the seeded collections first
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

const root = process.cwd();
const args = new Set(process.argv.slice(2));
const reset = args.has("--reset");
const force = args.has("--force");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB_NAME ?? "reserve";

if (!uri) {
  console.error(
    "MONGODB_URI is not set. Copy .env.example to .env.local and fill it in,\n" +
      "or start a local database with: docker compose up -d mongodb",
  );
  process.exit(1);
}

if (process.env.NODE_ENV === "production" && !force) {
  console.error(
    "Refusing to seed with NODE_ENV=production. This script is for\n" +
      "development data. Pass --force only if you are certain.",
  );
  process.exit(1);
}

const json = (relative) =>
  JSON.parse(readFileSync(path.join(root, relative), "utf8"));

const billing = json("src/entities/billing/content/plans.uk.json");

/**
 * Clubs moved into the database in M6. The content file is still where the
 * starting five live — it is version-controlled, reviewable and the same
 * data the tests use — but from here on an operator edits them in the
 * panel, so this only ever fills in what is missing.
 */
const clubs = json("src/entities/club/content/clubs.uk.json").map((club) => ({
  published: true,
  onlineBooking: true,
  ...club,
}));

const daysFromNow = (days) =>
  new Date(Date.now() + days * 86_400_000).toISOString();
const daysAgo = (days) =>
  new Date(Date.now() - days * 86_400_000).toISOString();

const users = [
  {
    id: "usr_1",
    phone: "+380671234567",
    name: "Олег Ковальчук",
    role: "guest",
    blocked: false,
    bookingsCount: 6,
    createdAt: daysAgo(40),
  },
  {
    id: "usr_2",
    phone: "+380442001234",
    name: "Володимир, «Класик»",
    role: "club_owner",
    blocked: false,
    bookingsCount: 0,
    clubId: "clb_kyiv_klasyk",
    createdAt: daysAgo(120),
  },
  {
    id: "usr_3",
    phone: "+380990000000",
    role: "guest",
    blocked: true,
    bookingsCount: 11,
    createdAt: daysAgo(12),
  },
];

const applications = [
  {
    id: "app_seed_1",
    clubName: "Дуплет",
    citySlug: "kharkiv",
    contactName: "Андрій Гончар",
    phone: "+380501234567",
    email: "duplet.kh@example.com",
    tableCount: 7,
    planId: "plan_vip",
    message: "Працюємо 6 років, хочемо приймати броні онлайн.",
    status: "pending",
    createdAt: daysAgo(1.5),
  },
  {
    id: "app_seed_2",
    clubName: "Кий і Куля",
    citySlug: "dnipro",
    contactName: "Марина Левченко",
    phone: "+380671112233",
    tableCount: 4,
    planId: "plan_basic",
    status: "pending",
    createdAt: daysAgo(0.2),
  },
];

const reviews = [
  {
    id: "rev_1",
    clubId: "clb_kyiv_klasyk",
    clubName: "Класик",
    authorName: "Олег К.",
    verified: true,
    rating: 5,
    text: "Столи в ідеальному стані, сукно нове. Адміністратор допоміг підібрати кий.",
    status: "published",
    createdAt: daysAgo(0.1),
  },
  {
    id: "rev_2",
    clubId: "clb_kyiv_abrikol",
    clubName: "Абріколь",
    authorName: "Ірина",
    verified: true,
    rating: 4,
    text: "Гарна музика і кухня, але ввечері шумно біля бару.",
    status: "published",
    createdAt: daysAgo(0.85),
  },
  {
    id: "rev_3",
    clubId: "clb_lviv_ratusha",
    clubName: "Ратуша",
    authorName: "Анонім",
    verified: false,
    rating: 1,
    text: "ЖАХ!!! не раджу нікому, краще йдіть у сусідній заклад за посиланням",
    status: "pending",
    createdAt: daysAgo(0.03),
  },
];

const promotions = [
  {
    id: "promo_launch",
    code: "STARTUA",
    description: "Перші три місяці VIP за півціни для нових клубів",
    percentOff: 50,
    expiresAt: null,
    active: true,
    usedCount: 0,
  },
];

const placements = [
  {
    clubId: "clb_kyiv_klasyk",
    planId: "plan_vip",
    featuredUntil: daysFromNow(30),
    bannerUntil: null,
    updatedAt: new Date().toISOString(),
  },
];

/** Inserts only the documents that are not already there. */
async function fill(db, name, documents, key = "id") {
  if (documents.length === 0) return { inserted: 0, kept: 0 };
  const collection = db.collection(name);

  if (reset) await collection.deleteMany({});

  const existing = new Set(
    (
      await collection.find({}, { projection: { [key]: 1, _id: 0 } }).toArray()
    ).map((doc) => doc[key]),
  );
  const missing = documents.filter((doc) => !existing.has(doc[key]));
  if (missing.length > 0) await collection.insertMany(missing);

  return { inserted: missing.length, kept: existing.size };
}

const client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000 });

try {
  await client.connect();
  const db = client.db(dbName);

  const results = {
    clubs: await fill(db, "clubs", clubs),
    billingFeatures: await fill(db, "billingFeatures", billing.features),
    billingPlans: await fill(db, "billingPlans", billing.plans),
    promotions: await fill(db, "promotions", promotions),
    placements: await fill(db, "placements", placements, "clubId"),
    users: await fill(db, "users", users),
    clubApplications: await fill(db, "clubApplications", applications),
    reviews: await fill(db, "reviews", reviews),
  };

  console.log(`Seeded ${dbName}${reset ? " (reset)" : ""}:`);
  for (const [name, { inserted, kept }] of Object.entries(results)) {
    console.log(`  ${name.padEnd(18)} +${inserted} inserted, ${kept} kept`);
  }
  console.log(
    "\nClubs are seeded once and then edited in the admin panel; re-running\n" +
      "this will not overwrite changes made there.",
  );
} catch (error) {
  // The URI carries credentials; report the failure, never the string.
  console.error(
    `Seed failed: ${error instanceof Error ? error.name : "Error"}.` +
      " Check that MongoDB is reachable.",
  );
  process.exitCode = 1;
} finally {
  await client.close();
}

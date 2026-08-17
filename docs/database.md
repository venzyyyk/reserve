# Database

Reserve stores bookings, payments, clubs and commercial state in MongoDB.

Clubs moved into the database in M6, because onboarding a club has to be a
phone call rather than a deploy. The content file still exists: it is what
`npm run seed` inserts, what the tests use, and what `next build` falls back
to when a build machine has no database. Nothing is written during a build,
and the runtime guard below is unaffected.

## Which storage is in use

Decided by configuration, never by what happens to be reachable:

| `MONGODB_URI` | `NODE_ENV`  | Storage                          |
| ------------- | ----------- | -------------------------------- |
| set           | any         | MongoDB                          |
| unset         | development | in memory (lost on restart)      |
| unset         | production  | **the process refuses to start** |

There is no fallback from MongoDB to memory. A production server that
degraded quietly would keep taking payments and lose every booking on the
next deploy; an error on the request that needed the database is the
smaller failure. See `src/shared/db/storage.ts`.

## Local development

```bash
docker compose up -d mongodb        # standalone mongod on :27017
cp .env.example .env.local          # MONGODB_URI is already filled in
npm run seed                        # billing plans, users, applications, reviews
npm run dev
```

No replica set and no `rs.initiate()`: the booking concurrency guard is a
single atomic document update, not a multi-document transaction
(see [ADR-0009](decisions/ADR-0009-booking-atomicity.md)).

Without Docker, any local `mongod` on port 27017 works, as does a free
Atlas cluster.

## MongoDB Atlas

1. Create a free M0 cluster.
2. **Database Access** — add a user with _Read and write to any database_.
3. **Network Access** — allow your IP, or `0.0.0.0/0` for a throwaway dev
   cluster. Never leave that open for production.
4. **Connect → Drivers** gives the connection string. Put it in
   `.env.local` (and in your host's secret store for deployment):

   ```
   MONGODB_URI=mongodb+srv://USER:PASSWORD@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   MONGODB_DB_NAME=reserve
   ```

5. `npm run seed`.

`MONGODB_URI` is server-only. It is read in one module
(`src/shared/db/client.ts`), never prefixed `NEXT_PUBLIC_`, and connection
errors are re-thrown without the string, because a driver error message
would otherwise print the password into your logs.

## Verifying persistence

The check the milestone exists for:

```bash
npm run dev
# book a table through the UI, note the /booking/<id> URL
# stop the server (Ctrl-C), start it again
# open that URL — the ticket is still there
```

And that two people cannot take one table:

```bash
npm run test:mongo          # includes the 10-way concurrent booking test
```

## Collections

| Collection         | Holds                                                                              |
| ------------------ | ---------------------------------------------------------------------------------- |
| `bookings`         | bookings in every state, with payment and refund fields                            |
| `bookingHolds`     | live holds, with the idempotency key that deduplicates them                        |
| `tableDays`        | the occupancy ledger — one document per club/table/date, and the concurrency guard |
| `payments`         | payment state, independent of which PSP produced it                                |
| `billingPlans`     | plans as Super Admin edits them                                                    |
| `billingFeatures`  | the feature catalogue plans are composed from                                      |
| `placements`       | which club is featured, until when, with which banner                              |
| `promotions`       | promo codes                                                                        |
| `clubApplications` | submissions from `/for-clubs/apply`                                                |
| `reviews`          | reviews and their moderation state                                                 |
| `users`            | phone numbers the platform has seen, plus roles                                    |
| `clubs`            | clubs as an operator edits them, drafts included                                   |
| `events`           | raw analytics events, expiring after 180 days                                      |

Indexes are declared in `src/shared/db/collections.ts`, each one next to the
query that needs it.

## Tests

`npm test` runs the fast suite against the in-memory adapter — no database
needed.

`npm run test:mongo` runs the integration, concurrency and chaos suites
against a real MongoDB. It needs `MONGODB_URI`; without it the suite fails
rather than skipping, so "the tests passed" cannot mean "the tests did not
run". It uses a database suffixed `_test` and clears it between files, so
point it at a development cluster, never at production data.

```bash
docker compose up -d mongodb
MONGODB_URI=mongodb://localhost:27017 npm run test:mongo
```

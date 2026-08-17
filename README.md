# Reserve

Book a billiard table in any club in Ukraine in seconds, pay online, walk in
with a QR code. UI language: Ukrainian. Docs and code: English.

**Source of truth:** `../MPS.md` (Master Project Specification). Every
implementation decision references it.

## Database

Bookings, payments and commercial state live in MongoDB.

```bash
docker compose up -d mongodb        # or point MONGODB_URI at Atlas
cp .env.example .env.local
npm run seed
npm run dev
```

Without `MONGODB_URI` the app runs on in-memory storage in development and
**refuses to start in production** — see [docs/database.md](docs/database.md).

Deploying: [docs/deployment.md](docs/deployment.md) (Vercel + Atlas).

## Run in 5 minutes

```bash
npm ci
npm run dev        # http://localhost:3000
```

## Scripts

| Script                    | Purpose                                           |
| ------------------------- | ------------------------------------------------- |
| `dev` / `build` / `start` | Next.js lifecycle                                 |
| `typecheck`               | `tsc --noEmit` (strict, noUncheckedIndexedAccess) |
| `lint`                    | ESLint incl. architecture boundary rules          |
| `format` / `format:fix`   | Prettier                                          |
| `test` / `test:watch`     | Vitest (unit + component)                         |
| `bundle:check`            | First-load JS budgets (run after build)           |
| `graph`                   | Dependency graph + architecture gate (see below)  |
| `adr:check`               | Validate the Architecture Decision Log            |
| `storybook`               | Design-system docs at http://localhost:6006       |
| `storybook:build`         | Static Storybook (built in CI)                    |

## Architecture in one diagram

```
app (routes) → widgets → features → entities → shared
              dependencies point DOWN only — lint-enforced
```

See `docs/ARCHITECTURE.md` and `docs/decisions/` (ADRs).

## Environment

All env is validated at boot (`src/shared/config/env.ts`) — the app refuses
to start half-configured.

| Variable                 | Required                | Purpose                     |
| ------------------------ | ----------------------- | --------------------------- |
| `NEXT_PUBLIC_APP_URL`    | no (defaults localhost) | Canonical origin            |
| `NEXT_PUBLIC_SENTRY_DSN` | no                      | Client error reporting      |
| `SENTRY_DSN`             | no                      | Server error reporting      |
| `NEXT_PUBLIC_FLAGS`      | no                      | JSON feature-flag overrides |

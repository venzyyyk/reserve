# Deployment

Vercel for the application, MongoDB Atlas for the data. Both have a free
tier that carries the first months, and the project needs no configuration
beyond environment variables: no Dockerfile, no custom server, no build
step to explain.

## Why this pair

Next.js is Vercel's own framework, so App Router, ISR and Server Actions
work without adaptation — including the on-demand revalidation the admin
panel performs when a club is edited. Atlas is managed MongoDB with a free
cluster and backups on paid ones.

Both should sit in **Frankfurt** (`fra1` on Vercel, `eu-central-1` on
Atlas). It is the closest region to Ukraine either offers, and having the
database in a different region than the functions is the single easiest way
to make a fast site feel slow: every query would cross Europe twice.

## 1. Database

1. **atlas.mongodb.com** → create a free **M0** cluster in
   `eu-central-1 (Frankfurt)`.
2. **Database Access** → add a user, _Read and write to any database_. Let
   Atlas generate the password; it goes into the connection string and
   nowhere else.
3. **Network Access** → `0.0.0.0/0`.

   This is the uncomfortable step and it is unavoidable: Vercel's functions
   do not have fixed IP addresses on the Hobby or Pro plans, so there is no
   narrower range to allow. What protects the database is the credential,
   not the network — which is why the password must be generated, long, and
   stored only in Vercel's environment variables. If that stops being
   acceptable, the answer is Atlas Private Endpoint on a dedicated cluster,
   not a hand-maintained IP list.

4. **Connect → Drivers** gives the connection string.

## 2. Application

Push the repository to GitHub, then **vercel.com → Add New → Project** and
import it. Framework detection, build command and output are all correct by
default. Set the region to `fra1` in _Settings → Functions_.

### Environment variables

_Settings → Environment Variables_, applied to Production and Preview:

| Variable              | Value                                     |
| --------------------- | ----------------------------------------- |
| `MONGODB_URI`         | the Atlas string, password included       |
| `MONGODB_DB_NAME`     | `reserve`                                 |
| `NEXT_PUBLIC_APP_URL` | `https://your-domain` — no trailing slash |
| `SUPERADMIN_PASSWORD` | a long random string, not `reserve-dev`   |

`NEXT_PUBLIC_APP_URL` is not decoration: canonical links, Open Graph tags
and `sitemap.xml` are all built from it. Left at its default, every shared
link and every page Google indexes points at `localhost:3000`.

`SUPERADMIN_PASSWORD` has a development default so the panel works out of
the box locally. In production it is the only thing between a stranger and
the admin panel, so the panel **refuses to open** if it is missing or still
set to the development value — the default is published in this repository,
which makes it no lock at all. Generate one and paste it into Vercel:

```bash
openssl rand -base64 32
```

There is only one password, for one operator, until per-user accounts exist.

**Give Preview deployments a separate database.** Set `MONGODB_DB_NAME` to
`reserve_preview` for the Preview environment, or a preview branch will
cancel real bookings while somebody tests a form.

## 3. Seed, once

The database starts empty, and an empty `billingPlans` collection means
`/for-clubs` shows no prices. From your machine, pointing at production:

```bash
MONGODB_URI="<atlas string>" MONGODB_DB_NAME=reserve npm run seed
```

It only inserts what is missing, so running it twice changes nothing. It
refuses to run with `NODE_ENV=production` unless forced, which is a guard
against seeding over an operator's edited prices by accident.

**This puts no clubs in the database, on purpose.** The sample catalogue —
five invented venues, guests with made-up numbers, applications nobody sent,
reviews nobody wrote — is behind `--demo` and belongs on a local database
only. Launching with fictional clubs and fabricated testimonials is a
different kind of wrong from a bug. Real clubs are added one at a time in
_Super Admin → Клуби_, as they sign up.

## 4. Domain

`.ua` requires a registered trademark. `.com.ua` does not and is what most
Ukrainian businesses use — register through a local registrar (imena.ua,
ukraine.com.ua, hostiq.ua), then in Vercel _Settings → Domains_ add it and
copy the DNS records it shows.

Update `NEXT_PUBLIC_APP_URL` to the real domain afterwards and redeploy, or
the metadata keeps pointing at the Vercel subdomain.

## 5. Check it worked

```
/                          the homepage renders, clubs are listed
/clubs/<city>/<slug>       a club page opens
/superadmin/login          the new password is accepted
/superadmin/analytics      "no data yet", not an error
```

Then book a table end to end. Payments are still the sandbox provider: the
booking will confirm and issue a QR code, and no money moves. That is the
correct behaviour until a real PSP is connected — see the note below.

## Costs, honestly

| Item         | Free        | When you outgrow it                                                                                                      |
| ------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------ |
| Vercel Hobby | yes         | Hobby forbids commercial use. Pro is $20/mo, and the moment the site takes real payments you need it.                    |
| Atlas M0     | yes, 512 MB | M10 is about $60/mo. 512 MB is years away at this size, but M0 has no backups — that matters sooner than the space does. |
| Domain       | —           | roughly $10–15/year for `.com.ua`                                                                                        |

The backup point is the one worth acting on early: on M0 an accidental
`deleteMany` is unrecoverable. Until the cluster is paid, take a periodic
`mongodump` — it is one command and it is the difference between an
incident and a catastrophe.

## What is still not production

- **Payments are a sandbox.** Bookings confirm and no money moves.
  Connecting LiqPay or WayForPay needs a merchant account, which needs a
  registered business.
- **Fiscal receipts (ПРРО) are not implemented.** Taking money from
  Ukrainian customers without them is a tax matter, and whose receipt it is
  — ours or the club's — is a question for an accountant, not for code.
- **One shared admin password**, no per-user accounts and no audit trail.
  Fine for one operator; not fine the day somebody else needs access.

Deploying now is still worth it: the clubs, the catalogue, the analytics
and the admin panel are all real, and the counter starts collecting the
numbers you will sell with from the first visitor.

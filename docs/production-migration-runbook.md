# Runbook: First Production Migration

This is the one-time procedure for taking this project from "schema only, no
committed migration history" to a real, reviewable, reproducible set of
Prisma migrations you can safely run against a production database.

Read the whole thing once before running anything — steps 3 and 7 are the
ones with no undo button.

---

## Why this exists

Up to now, every environment (local dev via `docker compose`, CI) has used
`prisma db push`, which looks at `schema.prisma` and directly makes the
database match it. That's fine for a throwaway database because there's
nothing to preserve and no history to get wrong. It is **not** what you want
for production, for three reasons:

- `db push` has no history — you can't see what changed between deploys, or
  roll one change back without rolling back everything.
- `db push` will silently accept destructive changes (dropping a column,
  narrowing a type) if you let it — `migrate dev`/`deploy` make you
  explicitly confront those with `--accept-data-loss` or by editing the
  generated SQL first.
- CI (`.github/workflows/ci.yml`) already checks for a `prisma/migrations`
  folder and switches to the stronger `prisma migrate deploy` check the
  moment one exists. Right now it can't do that check because there's
  nothing to check against.

## Prerequisites

- [ ] A local Postgres instance you can point at freely (the `docker-compose.yml`
      `db` service works: `docker compose up -d db`)
- [ ] The production `DATABASE_URL` / `DIRECT_URL` in hand, but **not yet
      used** until step 7
- [ ] Push access to the repo (you'll be committing a new `prisma/migrations/`
      folder)
- [ ] Nobody else is mid-way through a schema change on a branch — merge or
      pause other schema PRs first, or you'll generate a migration that
      conflicts with theirs

---

## Steps

### 1. Point `.env` at your local (not production) database

```bash
cp .env.example .env
# edit .env — DATABASE_URL should point at the local docker compose db,
# e.g. postgresql://hr:hr_dev_password@localhost:5432/hr_system?schema=public
docker compose up -d db
```

### 2. Generate the initial migration

```bash
npx prisma migrate dev --name init
```

This does three things: diffs `schema.prisma` against the (empty) local
database, writes the SQL to `prisma/migrations/<timestamp>_init/migration.sql`,
and applies it to your local database. Prisma Client also regenerates.

### 3. Read the generated SQL before doing anything else

```bash
cat prisma/migrations/*_init/migration.sql
```

For a brand-new schema this is all `CREATE TABLE` / `CREATE INDEX` / `CREATE
TYPE` statements — nothing destructive is possible on an empty database. Read
it anyway; it's the artifact you're about to commit and rely on for every
future migration diff. If anything looks wrong (a type you didn't expect, a
missing index), fix `schema.prisma` and regenerate rather than hand-editing
the SQL — the SQL should always be a faithful diff of the schema.

### 4. Seed and sanity-check locally

```bash
npx prisma db seed
npm run dev
```

Log in as each seeded role (`admin@acme.test`, `hr@acme.test`,
`manager@acme.test`, `jane@acme.test`, `alex@acme.test` — all
`Password123!`) and click through Employees, Leave, Payroll, Settings. This
is the last easy chance to catch a schema problem before it's the thing CI
and production both depend on.

### 5. Commit the migration

```bash
git add prisma/migrations/
git commit -m "Add initial Prisma migration"
git push
```

From this commit onward, **never edit `schema.prisma` without also running
`prisma migrate dev --name <description>`** to generate the matching
migration in the same PR. If you edit the schema and forget this step, CI's
schema-drift check (see the workflow file) will catch it — but it's cheaper
to just get in the habit now.

### 6. Confirm CI picked it up

Open the next PR (even a trivial one) and check the CI run — the "Sync test
database schema" step should now say it's running `prisma migrate deploy`,
not `prisma db push`. If it still says `db push`, the migrations folder
either wasn't committed or isn't at `prisma/migrations` — check `git status`
and the workflow's working directory.

### 7. Apply to production — the actual point of no return

Point at production **explicitly and deliberately**, not by editing `.env`
(too easy to leave it pointed there by accident):

```bash
DATABASE_URL="<production DATABASE_URL>" npx prisma migrate deploy
```

`migrate deploy` (unlike `migrate dev`) never prompts, never generates a new
migration, and never resets anything — it only applies migrations from
`prisma/migrations/` that haven't been applied yet, in order. Against a truly
empty production database, this applies just the one `init` migration.

**Before running this against a database that already has real data in it**
(e.g. you're migrating off `db push` on a production DB that isn't empty):

- Take a manual backup first, independent of your regular backup schedule —
  `pg_dump` it somewhere you can restore from in the next five minutes if
  needed.
- Run `npx prisma migrate diff --from-url "<production DATABASE_URL>" --to-schema-datamodel prisma/schema.prisma --script`
  first, on its own, and read the output. This shows what `deploy` is about
  to run without running it. If it contains anything other than harmless
  `CREATE` statements, stop and think — a `DROP COLUMN` or type change on a
  table with real rows needs a plan (usually: add the new column nullable,
  backfill, migrate the app, then drop the old column in a later migration)
  rather than being run blind.

### 8. Verify

```bash
curl https://<your-production-url>/api/health
```

Expect `{"status":"ok","database":"connected"}`. Then log in and spot-check
the same flows as step 4, against production this time.

---

## Every migration after this one

Once `prisma/migrations/` exists, the day-to-day loop is just:

```bash
# edit prisma/schema.prisma
npx prisma migrate dev --name <short_description>
# commit both the schema change and the new migration folder together
```

`migrate dev` against your local database generates and applies the diff;
`migrate deploy` (run in your deploy pipeline, or manually per step 7) is
what applies committed migrations to production. Never run `migrate dev`
against production — it's meant for local iteration and will prompt to
reset the database if it detects drift, which is exactly what you don't want
happening against real data.

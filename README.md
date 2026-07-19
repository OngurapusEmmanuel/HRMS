# HR Management System

A full HRMS built out from an MVP core: employees, leave, attendance, and
payroll, expanded to cover recruitment (ATS), performance management,
learning & development, compliance tracking, and workforce reporting —
built to scale from one company to a multi-tenant SaaS with minimal rework.

## Stack

- **Next.js 14 (App Router)** — UI + API routes in one deployable unit (Vercel-friendly)
- **TypeScript** end to end
- **PostgreSQL + Prisma** — typed schema, migrations, relational integrity (30 models)
- **NextAuth (Credentials + JWT)** — swap in SSO/OAuth later without touching business logic
- **Tailwind CSS** — utility-first styling
- **Recharts** — workforce trend charts on the Reports page
- **Zod** — request validation at every API boundary
- **AWS SDK (S3, SES)** — optional, dynamically imported only when those providers are selected

## Getting started

```bash
npm install
cp .env.example .env        # fill in DATABASE_URL
npx prisma migrate dev --name init
npx prisma db seed
npm run dev
```

Seed logins (all `Password123!`):

| Email | Role | Notes |
|---|---|---|
| `admin@acme.test` | Admin | full access |
| `hr@acme.test` | HR | full access except billing/org settings |
| `manager@acme.test` | Manager | heads Engineering only — scoping test case |
| `jane@acme.test` | Employee | Engineering; has appraisals, KPIs, a 360 round, overdue training |
| `taylor@acme.test` | Employee | Engineering, hired 2 months ago — mid-onboarding |
| `alex@acme.test` | Employee | Marketing |
| `priya@acme.test` | Employee | Marketing, **terminated** — has a generated contract summary |

Morgan and Chen are also seeded (terminated, at different points in the past
year) purely to give the Reports & Analytics turnover/headcount charts real
movement to show — no login needed for them.

The seed also creates: two job postings (one open with candidates at every
pipeline stage, including one with a pending offer), a scheduled interview,
three training courses with enrollments in different states (including one
overdue), and three compliance requirements (one overdue, one upcoming, one
recurring with a completed history entry).

### Local Postgres (optional)

```bash
docker compose up -d
```

Spins up Postgres 16 on `localhost:5432` matching `.env.example`'s default `DATABASE_URL`.

## Feature status

Fully wired end-to-end (form → API → DB → re-render). Grouped by module:

### Core HR

- **Auth** — credentials login, JWT session, edge middleware protecting all `(dashboard)` routes, password reset (`/forgot-password` → emailed single-use token, 1hr expiry → `/reset-password`, doesn't reveal whether an email is registered, rate-limited)
- **Employees** — searchable, paginated list, create (modal form), detail view, edit, soft-delete on termination, CSV export, org chart (`/org-chart`, renders the full reporting tree from `reportsToId`, collapsible)
- **Departments** — list, create
- **Leave** — self-service request form; approve/reject with atomic balance decrement, email notification, and audit log entry
- **Attendance** — self check-in/check-out, late detection, daily roster view
- **Payroll** — generate payslips using a progressive tax-bracket engine (editable per-org in Settings), idempotent generation, payslip history, CSV export
- **Documents** — upload/list/delete files against an employee record; pluggable storage (`STORAGE_PROVIDER=local` or `s3` — AWS S3, Cloudflare R2, or GCS's S3-compatible API)
- **Onboarding** — every new hire gets a checklist copied from the org's editable onboarding template at creation time
- **Notifications** — in-app bell (polls every 30s) plus emails for events that warrant them; pluggable email provider (`EMAIL_PROVIDER=console`, `resend`, or `ses`)
- **Settings** (`/settings`, HR/Admin) — leave entitlements, payroll tax brackets, onboarding template, integration status with test-send
- **Audit log** (`/audit-log`, HR/Admin) — append-only trail of sensitive actions across every module below

### Performance Management

- **Appraisals** — managers file periodic reviews (`/appraisals` to browse, or from an employee's profile) scored across five criteria, department-scoped. Appraisals are immutable once filed.
- **Contract summaries** — when an employee's contract ends (termination, or manually for a fixed-term contract nearing its `contractEndDate`), `lib/appraisal.ts` rolls up every appraisal on file into a `ContractSummary`: average rating, trend (Improving/Declining/Stable), condensed strengths/improvement themes, and a recommendation (Renew/Promote/Extend Probation/Do Not Renew).
- **KPIs** — managers set trackable goals (target/current/unit/period) on an employee's profile; the employee self-reports progress, the manager sets status (On Track/At Risk/Off Track/Completed) and gets notified when their own KPI is flagged at risk.
- **Review meetings** — managers schedule appraisal conversations against an employee, distinct from the written Appraisal itself; status tracked (Scheduled/Completed/Cancelled).
- **360° feedback** — a manager opens a feedback round naming providers (self/manager/peer/direct-report); each provider submits independently at `/feedback` ("my tasks"); peer and direct-report responses are anonymized for anyone without org-wide appraisal visibility.

### Applicant Tracking (Recruitment)

- **Job postings** (`/recruitment`) — draft/open/closed, department-linked
- **Pipeline** (`/recruitment/[id]`) — add candidates (dedupes by email within the org), track through Applied → Screening → Interview → Offer → Hired/Rejected
- **Interviews** — schedule against an interviewer (any active employee), record outcome (Pass/Fail) after
- **Offers** — extend with proposed salary and start date, track status (Pending/Accepted/Declined/Expired)
- **Hire conversion** — once an offer is Accepted, one action converts the application into a real `User` + `Employee` (same onboarding-template seeding as manually adding an employee), closing the loop from candidate to staff member

### Learning & Development

- **Course catalog** (`/learning`) — Compliance/Skills/Career categories, self-enroll or HR/manager-assigned (department-scoped for managers)
- **Progress tracking** — Not Started → In Progress → Completed, with overdue detection reconciled lazily on read (no cron needed) rather than requiring a background job

### Compliance Management

- **Requirements** (`/compliance`, HR/Admin) — recurring or one-time statutory obligations (title, jurisdiction, frequency, due date)
- **Auto-advancing records** — marking an occurrence complete automatically opens the next one for recurring requirements and advances the requirement's due date (`lib/compliance.ts`); overdue detection is lazy-reconciled the same way as training
- **CSV export** — current status of every requirement, for handing to auditors

### Reporting & Analytics

- **`/reports`** (HR/Admin) — active headcount, monthly/annual labor cost, and trailing-12-month turnover as stat cards, plus four charts: headcount trend, turnover rate trend, headcount by department (pie), labor cost by department (bar)
- **Headcount/turnover reconstruction** — computed from `hireDate`/`terminationDate` rather than stored monthly snapshots, so historical trends are correct even for data that predates the reporting feature itself
- **MIS export** — one CSV bundling headcount trend, turnover trend, and department breakdown as labeled sections

### Approval & visibility scoping (applies across every module above)

- **ADMIN / HR** see and can act on everything in the organization.
- **MANAGER** only sees and can act on data for employees in a department they head (`Department.managerId`) — enforced both in list queries and mutating endpoints via `canActOnDepartment` in `lib/rbac.ts`, so a crafted API call can't bypass what the UI hides. This applies to leave, attendance, payroll, appraisals, KPIs, meetings, 360 feedback requests, and training assignment.
- **EMPLOYEE** only ever sees their own records, with two deliberate exceptions: appraisal history is visible to the subject (transparency) but the contract summary isn't; 360 feedback from peers/reports is anonymized even to the subject's manager.

## Deployment

**Vercel + managed Postgres (Supabase/Neon/RDS)** — the default target. Set the env vars from `.env.example` in the Vercel project, run `npx prisma migrate deploy` against the production database, and deploy. Set `STORAGE_PROVIDER=s3` — Vercel's filesystem is ephemeral, so local-disk uploads will silently disappear between deploys.

**Docker / self-hosted:**

```bash
docker compose up -d          # Postgres + the app, built from the Dockerfile
docker compose exec app npx prisma migrate deploy
docker compose exec app npx prisma db seed   # optional, demo data
```

The `Dockerfile` produces a minimal image via Next's `output: 'standalone'` build. `STORAGE_PROVIDER=local` works fine here since the container is a persistent process, but uploads only survive container restarts if `public/uploads` is on a mounted volume (already wired in `docker-compose.yml`) — they won't survive a multi-instance/load-balanced deployment without S3.

## Testing & CI

```bash
npm run test        # run once
npm run test:watch  # watch mode
```

Unit tests: `lib/rbac.ts` (permission checks and department-scoping, Prisma mocked), `lib/payroll.ts` (progressive tax bracket math), `lib/appraisal.ts` (rating averages, recommendation thresholds, trend detection), `lib/analytics.ts` (headcount/turnover reconstruction, department bucketing), and `lib/rate-limit.ts`.

`.github/workflows/ci.yml` runs on every PR/push to `main`: install → generate → validate schema → sync a throwaway Postgres service container → lint → test → build. It uses `prisma db push` against the CI database until the project has a real committed migration history, at which point it automatically switches to `prisma migrate deploy` — the stronger check, since it verifies migrations actually reproduce the schema.

**Before your first production deploy:** run `npx prisma migrate dev --name init` locally against a real Postgres instance and commit the generated `prisma/migrations/` folder. This repo doesn't include one because it was built without a live database attached. Full step-by-step procedure: [`docs/production-migration-runbook.md`](./docs/production-migration-runbook.md).

## Operational notes

- **`GET /api/health`** — unauthenticated, checks the DB connection with `SELECT 1`. Wired into the Dockerfile's `HEALTHCHECK` and is what a load balancer or uptime monitor should poll.
- **Rate limiting** — `/api/auth/forgot-password` is limited to 5 requests per 15 minutes per IP+email pair via `lib/rate-limit.ts`, an in-memory limiter explicitly documented as single-instance-only — swap for Upstash Redis or similar before running multiple instances/serverless.
- **Lazy status reconciliation** — training enrollments and compliance records don't need a cron job to flip to OVERDUE; each list endpoint reconciles stale rows against "now" before returning (`lib/learning.ts`, `lib/compliance.ts`). Simple and correct at MVP scale; if the org grows enough that "every read does a bulk UPDATE" becomes a cost concern, move this to a scheduled job instead.

## Known MVP limitations / next steps

- `lib/payroll.ts`'s bracket schedule lives in the DB and is editable via Settings, but the *default* values seeded for a new org (`DEFAULT_BRACKETS`) are still an example schedule, not real statutory rates for any jurisdiction.
- Notifications are polled (30s interval), not pushed — fine at MVP scale; a persistent-connection host would be needed for websockets/SSE, which doesn't fit cleanly on serverless.
- The in-memory rate limiter needs to move to a shared store before a multi-instance deployment.
- No real migration history is committed yet (see "Before your first production deploy" above).
- The onboarding checklist, appraisal criteria, and compliance requirements are all org-editable, but the *appraisal criteria* (`APPRAISAL_CRITERIA` in `lib/appraisal.ts`) are still a fixed constant, unlike the other two — move to a per-org template the same way if that's needed.
- Job postings and the recruitment pipeline aren't department-scoped for managers the way everything else is (any Manager can view/manage any posting) — a deliberate simplification since hiring visibility is usually broader than day-to-day HR data, but worth revisiting if that's not true for your org.
- Reports & Analytics recomputes from every employee row on each page load rather than caching — fine for an MVP-scale tenant; add caching or a materialized summary table if the employee count grows large enough for this to matter.

## Why this architecture

- **Multi-tenant from day one.** Every table hangs off `organizationId`.
  Adding a second company later needs zero migration — the isolation is
  already there, and every query is scoped to the caller's org so tenants
  never leak into each other.
- **RBAC in one file (`lib/rbac.ts`).** Permissions aren't scattered as
  `if (role === 'ADMIN')` checks across routes — they're declared once and
  imported everywhere, so an audit or a new role is a one-file change. The
  same file also holds `canActOnDepartment`, reused by every module that
  needs manager-scoped-to-their-department access (leave, attendance,
  payroll, appraisals, KPIs, meetings, 360 feedback, training assignment).
- **API routes as the seam.** Next.js API routes double as the backend; if
  this ever needs to become a separate service, the `src/app/api` folder
  can be lifted into an Express/Fastify service with almost no logic
  changes, since routes are already thin and call into Prisma directly.
- **Transactions where money/state consistency matters.** Employee creation
  (User + Employee + onboarding tasks), leave approval (status + balance
  decrement), and compliance record completion (mark complete + open next
  occurrence) are all wrapped in `prisma.$transaction` so they can't
  half-complete.
- **Lazy reconciliation over cron jobs.** Anything that needs to become
  "overdue" as time passes (training, compliance) is reconciled at read
  time against the current instant, not by a scheduled job — one less
  moving part to deploy and monitor, at the cost of a bulk UPDATE on every
  list read. Revisit if that cost becomes real.

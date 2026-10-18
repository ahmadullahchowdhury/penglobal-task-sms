# Student Management System: Registry module

A small system of record for a university Registry. It covers four things:

- **Enrolment**: add, find and manage students, with a recorded status history.
- **Fees and payments**: balances, payments, reversals and an overdue dashboard.
- **Assessments and submissions**: staff set work, students upload PDF or DOCX files, late work is flagged.
- **Marksheet and results**: staff grade work and publish results, and students only ever see published ones.

Built with Next.js 16 (App Router), TypeScript, PostgreSQL, Prisma 7, Tailwind, shadcn/ui, Zod and Vitest.

The reasoning behind the design is in [DECISIONS.md](DECISIONS.md). This file is about running it.

## Run it locally

You need **Node 20.9 or newer** and **a PostgreSQL database**. Pick one way to get a database. Each one only changes `DATABASE_URL`.

### 1. Get a database

**Local PostgreSQL.** Create an empty database called `sms`, then use a URL like
`postgresql://USER:PASSWORD@localhost:5432/sms?schema=public`.

**Docker (optional).** From the project folder:

```bash
docker compose up -d
```

That starts Postgres 16 with exactly the URL in `.env.example`, so no edit is needed.

**A hosted free tier (Neon, Supabase).** Create a project and copy its connection string.
For Supabase use the *direct* or *session* connection string, not the transaction pooler,
because migrations need a normal connection.

### 2. Set up the project

```bash
git clone <this repo>
cd penglobal-task-sms
npm install
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set `DATABASE_URL` if you are not using the Docker default.

```bash
npm run db:generate         # builds the Prisma client into generated/prisma
npm run db:migrate          # creates the tables and database constraints
npm run db:seed             # loads the demo data (safe to run again)
npm run dev                 # http://localhost:3000
```

### Environment variables

| Variable | What it does |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string. Required. |
| `DEMO_ROLE_SWITCHER` | `true` shows the "Viewing as" menu. Demo only, never enable in production. |
| `UPLOAD_DIR` | Where uploaded files are stored, relative to the project root. Default `uploads`. Files are never served directly. |

### Other commands

| Command | What it does |
|---|---|
| `npm test` | Runs the unit and integration tests (see the note below). |
| `npm run typecheck` | TypeScript check. |
| `npm run lint` | ESLint. |
| `npm run build` / `npm start` | Production build and server. |
| `npm run db:reset` | **Deletes all data**, re-applies the migrations, empties `uploads/` and re-seeds. Development databases only. |

The integration tests talk to the real database and need the seed data to exist. Each one creates its own rows and removes only those afterwards.

## Using the role switcher

There is no real login. A "Viewing as" menu in the navbar lists the seeded users, and picking one sets a cookie that the server checks on every request. It is a stand-in for authentication, not a security feature. See [DECISIONS.md](DECISIONS.md), section 8.

**Tip:** the cookie is shared by every tab in a browser profile. To see two roles side by side, use a normal window for one and an incognito window for the other.

| User | Role | Good for |
|---|---|---|
| Amira Rahman | Registry Admin | Students, fees, payments, the overdue dashboard |
| Daniel Okoye | Staff | Assessments, submissions, the marksheet |
| Eight students | Student | Submitting work, results and fees as a student sees them |

### Demo data: which student shows what

| Student | Case |
|---|---|
| Priya Nair | Overdue on fees with a partial payment. Graded exactly 40 (the lowest Pass). |
| Marcus Bell | Fully paid. Published 78, a Distinction. |
| Elena Rossi | Deferred, with a reason in the history. |
| Tomasz Kowalski | Withdrawn but still owes money, so he stays on the overdue list. |
| Aisha Khan | A payment that was reversed. Her grade of 66 is withheld, so she sees "Result pending". |
| Liam O'Connor | Late submission, flagged with how late. |
| Sofia Almeida | On-time submission. Published 59, just under the Merit boundary. |
| Noah Fischer | Did not submit, so he is listed as "Not submitted". |

There is also an assessment that is open with no submissions yet, and a draft that students cannot see.

### A quick tour

1. As **Amira**, open the dashboard: total outstanding, counts by status and the overdue list (Tomasz, Priya, Noah).
2. Open **Priya**, then the Fees tab. Record a payment, then reverse it and watch the balance return.
3. Try to record a payment larger than the balance, or reuse a reference, and read the error.
4. As **Daniel**, open Assessments, then Programming Project, then Marksheet. Change a published grade and note the warning that it will be withheld again.
5. As **Aisha**, open Results: the withheld grade shows "Result pending". Calling `/api/me/results` directly returns nothing for it either.
6. As **Noah**, open Assessments and submit a PDF to the open one. Rename an `.exe` to `.pdf` and see it rejected.

## How it is built

- **Business rules are plain functions** in `lib/domain` (balance, overdue, classification, late flag, status transitions, file validation, student ID format). Routes and pages call them, and they are the most heavily tested part.
- **Route handlers stay thin.** Each one checks the role with `requireRole()`, validates input with Zod, calls a service in `lib/services`, and returns errors as `{ error: { code, message, fields? } }`.
- **Roles are enforced on the server** in every route, never by hiding a button.
- **Money is integer pence** and is formatted in one place (`lib/money.ts`).
- **Nothing derived is stored.** Balances, overdue state and classification are computed from the ledger and the score.
- **Multi-step writes use transactions**: enrolment (ID counter, student, history, fee charge), payments, reversals and status changes.
- **Never hard deleted, never edited:** students, payments and grades. Payment mistakes are corrected by a reversal row.
- **Database constraints back up the code:** score range, payment sign and non-zero, positive fee charges (added by hand to the first migration).

```
app/            pages and API route handlers
components/     UI (shadcn in components/ui)
lib/domain/     pure business rules and their tests
lib/services/   database work, in transactions
lib/validation/ Zod schemas
prisma/         schema, migrations, seed
```

## Edge cases handled on purpose

Each of these has a test or is shown by the demo data. The full list with reasoning is in [DECISIONS.md](DECISIONS.md), section 6.

- Overdue amount and days overdue, with payments applied to the oldest charge first
- Overpayment, zero and negative payments, duplicate references, and payments corrected by reversal
- Duplicate email, and two admins enrolling at the same moment (no duplicate Student IDs)
- Illegal status transitions, and a reason required to re-admit a withdrawn student
- Submitting after the deadline (accepted and flagged late), replacing a file before it, and being blocked after it
- A wrong file type, an oversized file, and a renamed extension (the file's first bytes are checked too)
- Submitting as a non-enrolled student, or to a module outside your programme
- Grades of -1, 101, 55.5 and exactly 39, 40, 59, 60, 69, 70
- Editing a published grade, which withholds it again and logs the old value
- A student asking for another student's grade, file or balance (not found)
- Deadlines compared in UTC on the server and shown in the viewer's local time

## Known limits

- The role switcher is not authentication. Students added through the UI do not get a login, so only seeded students can be viewed as.
- Uploaded files are stored on local disk. Cloud storage and virus scanning would replace that.
- Single currency (GBP), no payment gateway, no email notifications.

## What I would do next

1. Real authentication with per-user permissions and an admin view of the audit log.
2. Cloud file storage with virus scanning on upload.
3. Instalment plans, fee waivers and scholarships on top of the existing charge model.
4. Email reminders for overdue fees and approaching deadlines.
5. A second-marker and moderation step before results can be published.

## How I used AI

I used **Claude Code** (Claude Sonnet 5.5, in VS Code) to build most of this, working from a plan I wrote first: `DECISIONS.md` for the product rules, `PLAN.md` for the phases, the Prisma schema, and a `CLAUDE.md` of project rules (business rules in pure functions, role checks on the server, money as integers, never edit payments).

**What made it effective**
- **One small phase at a time.** Each ended with tests, typecheck, lint and a build, plus a check against the running app with real requests.
- **Tests for the risky parts first:** grade boundaries, overdue maths, two admins creating students or recording payments at once, and withheld grades never reaching a student.
- **Current docs, not memory.** I made it read the Next.js 16 docs bundled in `node_modules`, which caught things its training would have got wrong (for example the `error.tsx` prop is `retry`, and cookies need a Suspense boundary with `cacheComponents`).
- **I made the product decisions** (who can grade, what happens to a published grade that is edited, what counts as overdue) and recorded them in `DECISIONS.md`. I also reviewed the work and steered the UI.

**Where it was wrong, and what changed**
- The `db:reset` script used a flag Prisma 7 had removed, so it never worked. Fixed.
- The font variable referred to itself, so the app had never used its intended font. Fixed.
- The error handler swallowed a Next.js prerender signal and the build logged a warning. Fixed with the documented API.
- One test checked for a score like `"91"` in JSON, which could match digits inside an ID, so I made it check for the `score` field instead.
- A migration command is blocked for AI by Prisma unless I consent, so it never ran against my database.

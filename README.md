# Student Management System: Registry module

A small system of record for a university Registry. It covers four things:

- **Enrolment**: add, find and manage students, with a recorded status history.
- **Fees and payments**: balances, payments, reversals and an overdue dashboard.
- **Assessments and submissions**: staff set work, students upload PDF or DOCX files, late work is flagged.
- **Marksheet and results**: staff grade work and publish results, and students only ever see published ones.

Built with Next.js 16 (App Router), TypeScript, PostgreSQL, Prisma 7, Tailwind, shadcn/ui, Zod and Vitest.

The reasoning behind the design, the business rules and the edge cases handled are in [DECISIONS.md](DECISIONS.md). This file is about running it.

## Run it locally

You need **Node 20.9 or newer** and a **PostgreSQL** database. Create an empty database called `sms`, then:

```bash
git clone <this repo>
cd penglobal-task-sms
npm install
cp .env.example .env        # on Windows PowerShell: Copy-Item .env.example .env
```

Open `.env` and set `DATABASE_URL` to your database, for example
`postgresql://USER:PASSWORD@localhost:5432/sms?schema=public`.

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

### Other commands

- `npm test` runs the unit and integration tests. The integration tests use the real database and need the seed data; each one creates its own rows and removes only those.
- `npm run typecheck`, `npm run lint` and `npm run build` do what they say.
- `npm run db:reset` **deletes all data**, re-applies the migrations, empties `uploads/` and re-seeds. Development databases only.

## Using the demo

There is no real login. The "Viewing as" menu in the navbar lists the seeded users, and picking one sets a cookie that the server checks on every request. It stands in for authentication and is not a security feature (see [DECISIONS.md](DECISIONS.md), section 8). The cookie is shared by every tab in a browser profile, so use an incognito window to see two roles side by side.

| User | Role | Good for |
|---|---|---|
| Amira Rahman | Registry Admin | Students, fees, payments, the overdue dashboard |
| Daniel Okoye | Staff | Assessments, submissions, the marksheet |
| Eight students | Student | Submitting work, results and fees as a student sees them |

Students created in the app have no login, so they do not appear in the menu. Only the eight seeded students can be viewed as.

### Which seeded student shows what

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

There is also an open assessment with no submissions yet, and a draft that students cannot see.

### A quick tour

1. As **Amira**, open the dashboard: total outstanding, counts by status and the overdue list.
2. Open **Priya**, then the Fees tab. Record a payment, reverse it, and watch the balance return.
3. As **Daniel**, open Assessments, then Programming Project, then Marksheet. Change a published grade and note the warning that it will be withheld again.
4. As **Aisha**, open Results: the withheld grade shows "Result pending".

## How it is built

Business rules are plain functions in `lib/domain`, called by thin route handlers and pages, with roles checked on the server in every route. Money is integer minor units, balances are never stored, multi-step writes use transactions, and students, payments and grades are never deleted or edited. The full list of decisions and edge cases, each with a test or demo case, is in [DECISIONS.md](DECISIONS.md).

```
app/            pages and API route handlers
components/     UI (shadcn in components/ui)
lib/domain/     pure business rules and their tests
lib/services/   database work, in transactions
lib/validation/ Zod schemas
prisma/         schema, migrations, seed
```

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
- A refactor passed icon components from a server page into a client component, which crashed the page at render time. Typecheck and lint did not catch it; checking the running page did. Fixed by passing icon names instead.
- A migration command is blocked for AI by Prisma unless I consent, so it never ran against my database.

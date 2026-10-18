# Build Plan

This is the plan I followed to build the Registry module. The work is split into small phases. Each phase is one focused session with the coding agent, ends with working software, and produces a few commits. 

## Working rules (apply to every phase)

1. **Every session starts with the docs.** The agent reads `CLAUDE.md`, `DECISIONS.md` and `prisma/schema.prisma` first.
2. **One phase per session.** The agent is told to do only that phase, then stop and summarise what changed.
3. **No extras.** The agent is told not to add libraries, features or refactors outside the phase.
4. **I verify before committing.** I run the app, run the tests and read the diff. If I cannot explain a line, I ask the agent to explain it or simplify it.
5. **I log as I go.** After each phase I add a few lines to `AI_LOG.md` (template at the bottom). This feeds the AI section of the README.
6. **Commits are small and describe what actually changed.** Conventional style (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one logical change per commit.
7. **Fixes stay visible.** When the agent gets something wrong, the correction goes in its own commit.

The agent is never asked to build the whole app in one prompt.

## Agent rules file

`CLAUDE.md` is created in Phase 0 with this content:

```
# Project rules
Stack: Next.js 16 App Router, TypeScript, PostgreSQL, Prisma 7, Tailwind, shadcn/ui, Zod, Vitest. Node 20.9+.
Always read DECISIONS.md and prisma/schema.prisma before changing anything.

Versions (do not write older patterns):
- Next.js 16: cookies(), headers() and route params are async and must be awaited. No middleware.ts.
- Prisma 7: the generator is "prisma-client" with an output path (generated/prisma). The datasource URL
  lives in prisma.config.ts, not in schema.prisma. Prisma Client is created with the @prisma/adapter-pg
  driver adapter and imported from the generated folder, not from "@prisma/client". .env is loaded
  explicitly with dotenv. Do not assume migrate runs generate or seed; use the npm scripts
  db:generate, db:migrate, db:seed and db:reset.

Conventions:
- Business rules live in pure functions in lib/domain (balance, overdue, classification,
  late flag, status transitions, student ID format). Routes and UI call them. No rules in components.
- Money is integer minor units. Format only through lib/money.ts.
- Validate every API input with Zod. Return errors as { error: { code, message, fields? } }.
- Check the role on the server in every route with requireRole(). Never rely on hidden UI.
- Multi-step writes use prisma.$transaction.
- Never hard delete students, payments or grades.
- Never store balances. Never edit payments (reverse them).
- No mock data in component state. Everything reads from the database.
- Do not add dependencies or features that were not asked for in the current phase.
- Never commit .env. Keep .env.example current.
```


## Phase 0: Project setup and docs

**Goal:** an empty app that runs, with the docs committed first so the history shows planning came before coding.

**Note on Docker:** Docker is optional. The app only needs PostgreSQL reachable through `DATABASE_URL`, so the compose file is a convenience and the README does not depend on it.

**Scope:**
- Next.js 16 App Router (Node 20.9+) with TypeScript, Tailwind, shadcn/ui, Zod and Vitest
- Prisma 7 with the PostgreSQL driver adapter, `prisma.config.ts`, and explicit npm scripts: `db:generate`, `db:migrate`, `db:seed`, `db:reset`
- `.env.example`, `.gitignore` (including `uploads` and `generated/prisma`), and `CLAUDE.md`
- `DECISIONS.md`, `PLAN.md` and `prisma/schema.prisma` in place
- Optional `docker-compose.yml`

**Done when:** `npm run dev` shows the default page, Postgres is reachable through `DATABASE_URL` (local install, Docker, or a hosted free tier), `npx prisma validate` passes, and `.env` is ignored.

---

## Phase 1: Schema, migration, domain rules

**Goal:** the database exists and the pure business rules exist with tests, before any UI.

**Scope:**
- First migration, including the raw SQL CHECK constraints from the schema header
- Prisma Client singleton and a money formatting helper
- Pure functions in `lib/domain` with unit tests: score classification, score validation, status transitions, student number format, late submission check
- Boundary tests at 39, 40, 59, 60, 69, 70, 0, 100, -1, 101 and 55.5

**Done when:** `npm run db:migrate` succeeds, `npm run db:generate` produces the client in `generated/prisma`, and `npm test` passes.

---

## Phase 2: App shell and role switcher

**Goal:** a reviewer can switch between Admin, Staff and a specific student, and the server enforces it.

**Scope:**
- Minimal seed: one Registry Admin, one Staff user, 2 programmes, modules
- "Viewing as" dropdown that sets an httpOnly cookie, with a demo mode badge, shown only when `DEMO_ROLE_SWITCHER=true`
- `getCurrentUser()` and `requireRole()` helpers used on the server
- `/staff/*` and `/student/*` route groups with redirects for the wrong role
- A small test or script proving a student gets 403 from a staff API route

**Done when:** switching roles changes the navbar and landing page, and a student cannot open `/staff`.

---

## Phase 3: Enrolment

**Goal:** the Registry can add, find and manage students.

**Scope:**
- Create and list API. Creating a student runs in one transaction: race-safe student ID, initial status history, and a fee charge from the programme. Validation covers unique email and date of birth. Search by name, ID or email, filters by programme and status, pagination. A concurrency test confirms IDs stay unique.
- Status changes with transition rules, a required reason for re-admission, status history and an audit entry
- Students list page with search, filters, badges, pagination and an empty state
- Create form and student detail page with history and a status change dialog

**Done when:** a student can be created and shown as `SMS-2025-0001`, found through search, and have their status changed, and illegal transitions show a readable error.

---

## Phase 4: Fees and payments

**Goal:** accurate balances, safe payment recording, an overdue dashboard.

**Scope:**
- Domain logic with tests: balance, and overdue amount and days overdue with payments applied to the oldest charge first
- Payments API: positive integer amounts, unique reference, overpayment rejected with a clear message, reversal as a linked negative entry, audit entries
- Fees tab on the student page: charges, payment history, balance, record payment, reverse with confirmation
- Staff dashboard: total outstanding, counts by status, overdue table sorted by days overdue
- Student fees page with an overdue notice

**Done when:** recording a payment drops the balance immediately, reversing it restores the balance, and the overdue student appears on the dashboard.

---

## Phase 5: Assessments (staff)

**Goal:** staff can create and manage assessments.

**Scope:**
- Assessments API with title, module, deadline (future at creation) and state (Draft, Open, Closed)
- Staff list showing module, deadline, state, submission count and late count, plus a create form
- Open and close actions. Students never see Draft assessments.

**Done when:** staff can create a Draft, open it, close it, and the list shows counts.

---

## Phase 6: Submissions (students)

**Goal:** file upload with all the late and resubmission rules.

**Scope:**
- Upload API: student must be Enrolled, assessment must be Open and in the student's programme. Server-side validation of extension, MIME type, size and file signature. Files stored with random names outside any public folder.
- Late flag decided at submit time. Resubmission replaces the file before the deadline and is rejected after it.
- Authorised file download: staff can download any, a student only their own
- Student page for open assessments with state, upload and resubmit controls
- Staff submissions table with a Late badge and a list of students who have not submitted

**Done when:** a student can submit and resubmit before the deadline, resubmission is blocked after it, the Late badge shows, and a renamed `.exe` is rejected.

---

## Phase 7: Marksheet and results

**Goal:** grading, publish and withhold, with the withheld rule enforced in the API.

**Scope:**
- Grade API: integer 0 to 100, only for students with a submission. Editing a published grade withholds it again and records the previous value in the audit log.
- Publish and withhold per grade, plus bulk publish for an assessment
- Student results API returning only published grades, with tests for withheld grades and for another student's results
- Staff marksheet with score input, live classification, publish toggle, Late badge and disabled "Not submitted" rows
- Student results page with published grades and a "Result pending" state

**Done when:** a published grade is visible to the student, withholding it removes it, and calling the student endpoint directly never leaks a withheld grade.

---

## Phase 8: Seed data for edge cases

**Goal:** a reviewer opens the app and sees every edge case already working.

**Scope:**
- Idempotent seed with 2 programmes, modules, at least 8 students, and linked student users for the role switcher
- Deliberate cases: overdue with a partial payment, fully paid, Deferred, Withdrawn who still owes money, a payment with a reversal, on-time and late submissions, a withheld grade, a published Distinction, grades of exactly 40 and 59, and an Open assessment with no submissions
- A comment block at the top of the seed listing which student shows which case

**Done when:** `npm run db:reset && npm run db:seed` gives a populated app in one command.

---

## Phase 9: Hardening and polish

**Goal:** error handling, loading and empty states, and an edge case sweep.

**Scope:**
- Review the app against the edge case list in `DECISIONS.md`, list gaps, then fix them in small commits
- Consistent API error shape and readable form errors
- Loading and empty states on every list
- Dates shown in local time and compared in UTC on the server
- No `console.log` leftovers or unused code, lint and type check pass

---

## Phase 10: README, AI section, final check

**Goal:** a reviewer can run the project from a clean clone in under five minutes.

**Scope:**
- README covering what the project is, three ways to get a database (local Postgres, optional Docker, hosted free tier), env vars, install, generate, migrate, seed, run, how to use the role switcher including the incognito tip, key decisions, edge cases handled, and what I would do next
- "How I used AI" written by me from  tools used, what worked, where the output was wrong and what I changed, and what I wrote by hand.

**Final check (always done before submitting):**
1. Clone the repo into a fresh folder.
2. Follow only the README steps.
3. Confirm install, generate, migrate, seed and run all work.
4. Confirm `.env` is not in the repo and `.env.example` is complete.
5. Add 3 to 5 screenshots or a short Loom walkthrough.

---


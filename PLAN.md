# PLAN.md: Phase-wise build plan

Build in small phases. Each phase is one focused session with the coding agent, ends with working software, and produces one to three commits. Never ask the agent to build the whole app in one prompt.

## Working rules (apply to every phase)

1. **Start each session by pointing the agent at the docs.** Tell it to read `CLAUDE.md`, `DECISIONS.md` and `prisma/schema.prisma` first.
2. **One phase per session.** Say "do only this phase, then stop and summarise what changed".
3. **No extras.** Tell it not to add libraries, features or refactors outside the phase.
4. **You verify before committing.** Run the app, run the tests, read the diff. If you cannot explain a line, ask the agent to explain it or simplify it.
5. **Log as you go.** After each phase, add 2 to 4 lines to `AI_LOG.md` (template at the bottom). This becomes your README AI section.
6. **Commit messages:** conventional style (`feat:`, `fix:`, `test:`, `docs:`, `chore:`), one logical change per commit.
7. **If the agent gets something wrong, keep the fix visible.** A commit like `fix: reject payments larger than outstanding balance` is evidence of judgement.

## Agent rules file

Create `CLAUDE.md` (or your tool's equivalent) in Phase 0 with this content:

```
# Project rules
Stack: Next.js 14+ App Router, TypeScript, PostgreSQL, Prisma, Tailwind, shadcn/ui, Zod, Vitest.
Always read DECISIONS.md and prisma/schema.prisma before changing anything.

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

## Phase overview

| Phase | Goal | Day | Commits |
|---|---|---|---|
| 0 | Project setup and docs | 1 | 2 |
| 1 | Schema, migration, domain constants | 1 | 2 |
| 2 | App shell and role switcher | 2 | 2 |
| 3 | Enrolment | 2 | 4 |
| 4 | Fees and payments | 3 | 4 |
| 5 | Assessments (staff) | 4 | 2 |
| 6 | Submissions (students) | 4 | 3 |
| 7 | Marksheet and results | 5 | 4 |
| 8 | Seed data for edge cases | 5 | 1 |
| 9 | Hardening and polish | 6 | 3 |
| 10 | README, AI section, final check | 7 | 2 |

---

## Phase 0: Project setup and docs

**Goal:** an empty app that runs, with docs committed first so the history shows you planned before coding.

**Note on Docker:** the assessment does not require it. It only asks for PostgreSQL with Prisma, a `.env.example`, and a README explaining how to run locally. The compose file is optional and the README must not depend on it.

**Prompt to agent:**
> Set up a Next.js 14+ App Router project with TypeScript and Tailwind in this folder. Add shadcn/ui, Prisma, Zod and Vitest. Add a `.env.example` containing `DATABASE_URL` and a proper `.gitignore` (node_modules, .env, uploads). Also add an optional `docker-compose.yml` with a Postgres service, purely as a convenience for anyone who wants it; the app must work with any Postgres reachable through `DATABASE_URL`. Place my existing `DECISIONS.md`, `PLAN.md` and `schema.prisma` (into `prisma/schema.prisma`). Create `CLAUDE.md` from the rules in PLAN.md. Do not build any features.

**Done when:** `npm run dev` shows the default page, Postgres is reachable through `DATABASE_URL` (local install, Docker, or a hosted free tier), and `.env` is ignored.

**Commits:**
1. `docs: add decisions, plan and agent rules`
2. `chore: scaffold next.js, prisma, tailwind, shadcn, vitest`

---

## Phase 1: Schema, migration, domain constants

**Goal:** the database exists and the pure business rules exist with tests, before any UI.

**Prompt to agent:**
> Read DECISIONS.md and prisma/schema.prisma. Create the first migration. Add the raw SQL CHECK constraints listed in the schema header comment to that migration. Create `lib/db.ts` (Prisma singleton), `lib/money.ts` (format minor units), and `lib/domain/` with pure functions and Vitest tests for: `classify(score)`, `isValidScore(score)`, `canTransition(from, to)`, `formatStudentNumber(year, seq)`, `isLateSubmission(submittedAt, deadline)`. Boundary tests must include 39, 40, 59, 60, 69, 70, 0, 100, -1, 101 and 55.5.

**Done when:** `prisma migrate dev` succeeds, `npm test` passes.

**Commits:**
1. `feat(db): initial schema and migration with check constraints`
2. `feat(domain): classification, status transitions, late flag, id format (with tests)`

---

## Phase 2: App shell and role switcher

**Goal:** a reviewer can switch between Admin, Staff and a specific student, and the server enforces it.

**Prompt to agent:**
> Add a minimal seed (`prisma/seed.ts`) with one Registry Admin, one Staff user, 2 programmes, and 2 module rows per programme. Build the app shell with a navbar and a "Viewing as" dropdown listing seeded users. Selecting one calls `POST /api/dev/switch-role`, which sets an httpOnly cookie. Add `getCurrentUser()` and `requireRole(...roles)` helpers that read the cookie on the server. Route groups: `/staff/*` for Admin and Staff, `/student/*` for students, with redirects for the wrong role. Show a "Demo mode: role switcher stands in for real authentication" badge. The switcher only renders when `DEMO_ROLE_SWITCHER=true`; add that to `.env.example`. Add one test or curl script proving a student cookie gets 403 from a staff API route (create a tiny `GET /api/staff/ping` for this).

**Done when:** switching roles changes the navbar and landing page, and a student cannot open `/staff`.

**Commits:**
1. `feat(auth): cookie role switcher and requireRole helper`
2. `feat(ui): app shell with role-based navigation`

---

## Phase 3: Enrolment

**Goal:** the Registry can add, find and manage students.

Split into small prompts, one per commit:

**3a. API and ID generation**
> Build `POST /api/students` and `GET /api/students`. Creating a student runs in one transaction: increment the `StudentIdCounter` for the academic year, build the `studentNumber`, create the student, write the initial `StatusChange`, and create the `FeeCharge` from the programme (amount snapshot, due date = today + programme.feeDueDays). Validate with Zod (unique email, DOB in the past and a sensible age range). `GET` supports search by name, ID or email, filter by programme and status, and pagination. Admin only. Add a test that creates 20 students concurrently and asserts all IDs are unique.

**3b. Status changes**
> Build `PATCH /api/students/[id]/status`. Enforce `canTransition`, require a reason for re-admission, write a `StatusChange` row and an `AuditLog` entry in one transaction. Return a clear error for illegal transitions.

**3c. Students list UI**
> Build `/staff/students` with a table, search box, programme and status filters, status badges, pagination, and an empty state.

**3d. Create and detail UI**
> Build the create student form (react-hook-form + Zod, field-level errors) and `/staff/students/[id]` showing details, status history and a status change dialog.

**Done when:** you can create a student, see `SMS-2025-0001`, search for them and change status, and illegal transitions show a readable error.

**Commits:**
1. `feat(students): create/list API with race-safe student id`
2. `feat(students): status transitions with history and audit`
3. `feat(ui): students list with search, filters, pagination`
4. `feat(ui): create student form and detail page`

---

## Phase 4: Fees and payments

**Goal:** accurate balances, safe payment recording, an overdue dashboard.

**4a. Domain logic first**
> In `lib/domain`, write pure functions with tests: `computeBalance(charges, payments)`, `computeOverdue(charges, payments, now)` returning `{ overdueAmount, daysOverdue }`, applying payments to the oldest charge first. Test: fully paid, partially paid, nothing due yet, past due with no payment, multiple charges, payment then reversal, exactly on the due date.

**4b. API**
> Build `POST /api/students/[id]/payments` (positive integer amount, unique non-empty reference, reject amounts larger than the outstanding balance with a clear message) and `POST /api/payments/[id]/reverse` (creates a negative `REVERSAL` row linked to the original, rejects a second reversal, writes an `AuditLog` entry). Build `GET /api/students/[id]/fees` returning charges, payments, balance and overdue state. Admin only for writes. Students may read only their own.

**4c. UI**
> On the student detail page add a Fees tab: charges, payment history, outstanding balance, a record payment dialog, and a reverse button with confirmation. Build `/staff/dashboard` showing total outstanding, counts by enrolment status, and a table of overdue students with amount, days overdue and status badge, sorted by days overdue.

**4d. Student view**
> Build `/student/fees` for the logged-in student showing their charges, payments and balance, with an overdue notice.

**Done when:** record a payment and see the balance drop immediately, reverse it and see it return, and see the overdue student on the dashboard.

**Commits:**
1. `feat(domain): balance and overdue calculation (with tests)`
2. `feat(fees): payments api with reversal and validation`
3. `feat(ui): fees tab and overdue dashboard`
4. `feat(ui): student fees page`

---

## Phase 5: Assessments (staff)

**Goal:** staff can create and manage assessments.

**Prompt to agent:**
> Build `POST/GET/PATCH /api/assessments`. Fields: title, module, deadline (must be in the future at creation), state (Draft, Open, Closed). Staff and Admin only. Build `/staff/assessments` with a list (module, deadline, state, submission count, late count) and a create form. Add buttons to open and close an assessment. Students never see Draft assessments.

**Done when:** staff can create a Draft, open it, close it, and the list shows counts.

**Commits:**
1. `feat(assessments): api for create, list, state change`
2. `feat(ui): staff assessments list and form`

---

## Phase 6: Submissions (students)

**Goal:** file upload with all the late and resubmission rules.

**6a. Upload API**
> Build `POST /api/assessments/[id]/submissions` (multipart). Rules: student must be Enrolled, the assessment must be Open and belong to a module in the student's programme. Validate extension, MIME type, size limit, and file signature (PDF starts with `%PDF`, DOCX is a zip starting with `PK`). Save under `uploads/` with a random name; store the original name as metadata. If no submission exists, create it with `isLate = isLateSubmission(now, deadline)`. If one exists and the deadline has not passed, replace the file and delete the old one. If the deadline has passed and one exists, reject with a clear message.

**6b. File download**
> Build `GET /api/submissions/[id]/file` with authorisation: staff can download any, a student only their own. Files are never served from a public folder.

**6c. UI**
> Student: `/student/assessments` listing open assessments for their programme with deadline, state (not submitted, submitted, submitted late), upload and resubmit controls, and a countdown or overdue note. Staff: a submissions table per assessment with student, submitted time, a visible Late badge, how late, and a download link. Also list students who have not submitted.

**Done when:** you can submit, resubmit before the deadline, see resubmission blocked after, see the Late badge, and a renamed `.exe` is rejected.

**Commits:**
1. `feat(submissions): upload api with validation and late flag`
2. `feat(submissions): authorised file download`
3. `feat(ui): student submission page and staff submissions view`

---

## Phase 7: Marksheet and results

**Goal:** grading, publish and withhold, with the withheld rule enforced in the API.

**7a. Grade API**
> Build `PUT /api/assessments/[id]/grades/[studentId]` (integer 0 to 100, only if the student has a submission, staff only). If the grade was published and the score changes, set `isPublished = false`, record the previous value in `AuditLog`. Build `POST` endpoints to publish or withhold a single grade, and a bulk "publish all graded" for an assessment. Record `publishedAt` and `publishedById`.

**7b. Student results API**
> Build `GET /api/me/results`. It must query only grades where `isPublished = true` for the current student. The response must contain nothing about unpublished grades. Add a test where a student with an unpublished grade calls the endpoint and the grade is absent from the response, and another where requesting another student's results returns not found.

**7c. Staff marksheet UI**
> Build a marksheet per assessment: a table of submitters with score input, live classification badge, published/withheld toggle, Late badge, and "Not submitted" rows disabled. Show a confirmation when editing an already published grade, explaining it will be withheld again.

**7d. Student results UI**
> Build `/student/results`: published grades with score and classification, and "Result pending" for submitted work whose grade is not published.

**Done when:** publish a grade and the student sees it, withhold it and it disappears, and calling the student endpoint directly never leaks a withheld grade.

**Commits:**
1. `feat(grades): grade entry with audit and auto-withhold on edit`
2. `feat(grades): publish, withhold and bulk publish`
3. `feat(ui): staff marksheet`
4. `feat(ui): student results with pending state`

---

## Phase 8: Seed data for edge cases

**Goal:** the reviewer opens the app and sees every edge case already working.

**Prompt to agent:**
> Extend `prisma/seed.ts` to be idempotent (safe to run twice) and create: 2 programmes, modules, at least 8 students, and linked student users for the role switcher. Include deliberately: one student overdue on fees with a partial payment, one fully paid, one Deferred, one Withdrawn who still owes money, one student with a payment and a reversal, one on-time submission, one late submission, one withheld grade, one published Distinction, one grade of exactly 40, one grade of 59, and one assessment still Open with no submissions. Add an npm script `db:seed` and a comment block at the top of the seed listing which student demonstrates which case.

**Done when:** `npm run db:reset && npm run db:seed` gives a populated app in one command.

**Commit:** `feat(seed): demo data covering overdue, late, withheld and boundary cases`

---

## Phase 9: Hardening and polish

**Goal:** error handling, loading and empty states, and an edge case sweep.

**Prompt to agent:**
> Review the app against the "Edge cases handled on purpose" list in DECISIONS.md and report which ones are not yet covered or tested. Do not fix anything yet, just list gaps.

Then fix the gaps in small commits. Also check:
- Consistent API error shape and readable form errors
- Loading and empty states on every list
- Dates displayed in local time, compared in UTC on the server
- No `console.log` leftovers, no unused code
- Lint and type check pass

**Commits:**
1. `test: cover remaining edge cases`
2. `fix: [whatever the sweep finds]`
3. `style: loading, empty and error states`

---

## Phase 10: README, AI section, final check

**Goal:** a reviewer can run it from a clean clone in under five minutes.

**Prompt to agent (README draft only):**
> Draft a README from DECISIONS.md and AI_LOG.md: what it is, how to run it locally (three ways to get a database: local Postgres, optional Docker, or a hosted free tier like Neon or Supabase, each only changing `DATABASE_URL`; then env vars, migrate, seed, dev), how to use the role switcher including the incognito tip, key decisions, edge cases handled, and what I would do next. Do not write the "How I used AI" section; I will write that from my log.

You then write "How I used AI" yourself from `AI_LOG.md`: tools used, what worked, where the output was wrong and what you changed, what you wrote by hand.

**Final check (do not skip):**
1. Clone the repo into a fresh folder.
2. Follow only the README steps.
3. Confirm install, migrate, seed and run all work.
4. Confirm `.env` is not in the repo and `.env.example` is complete.
5. Add 3 to 5 screenshots or a short Loom walkthrough.

**Commits:**
1. `docs: readme with setup, decisions and edge cases`
2. `docs: ai usage section and screenshots`

---

## AI_LOG.md template

Keep it short and specific. Add an entry after every phase.

```
## Phase N: <name>
- Tool and model used:
- What I asked for (one line):
- What it got right:
- What it got wrong or missed, and how I fixed it:
- What I wrote or changed by hand:
```

Example of the quality to aim for:

```
## Phase 4: Fees and payments
- Tool: Claude Code
- Asked for: payments API with reversal and overdue calculation
- Right: clean Zod validation, transaction around payment plus audit
- Wrong: first version stored a running balance on Student, which could drift. I removed the column and derived it from charges and payments.
- By hand: wrote the overdue boundary tests (payment exactly on due date) myself.
```

## Time guide

If you fall behind, cut in this order: bulk publish, audit log views, dashboard polish. Never cut: server-side role checks, the withheld-results API rule, the seed data, the README run instructions, or the AI section.
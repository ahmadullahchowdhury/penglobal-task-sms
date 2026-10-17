# DECISIONS

This document records the product and technical decisions I made for the Registry module, and why. Where the brief was ambiguous I picked a behaviour, wrote it down, and built it consistently.

## 1. How I framed the problem

A Registry team is the system of record for who a student is, whether they owe money, whether they handed work in, and what they have been told about their results. Their biggest fears are wrong records, silent data loss, and a student seeing something they should not (an unpublished grade, someone else's file). So the design leans toward:

- **Auditability over convenience.** Money and grades are never silently overwritten.
- **Rules enforced on the server.** The UI hides things, but the API is what protects them.
- **Derived values over stored values** wherever drift is possible (balances, classification, overdue state).

## 2. Users and their daily work

| Role | What they do every day | What the app optimises for |
|---|---|---|
| Registry administrator | Enrol students, fix records, chase unpaid fees, record payments | Fast search, a dashboard that shows problems first, safe corrections |
| Academic staff | Create assessments, review submissions, enter and publish grades | Seeing who has and has not submitted, who is late, what is still unpublished |
| Student | Submit work, see own fee balance, see published results | A clear view of own status, no access to anything else |

Role handling is a simple role switcher, as the brief allows. See section 8 for how I kept it honest.

## 3. Assumptions where the brief was ambiguous

| Question | Decision | Reason |
|---|---|---|
| What does "open assessment" mean if late work is accepted? | An assessment has a state: Draft, Open, Closed. Open means accepting submissions, including late ones. The deadline only decides whether a submission is flagged late. Staff can Close an assessment to stop all submissions. | Gives staff a real control without contradicting "late submissions are accepted". |
| Can a student resubmit after the deadline? | No. Resubmission is allowed before the deadline only. After the deadline a student with no submission can make one late submission, which is flagged and then locked. | Matches the brief literally and prevents a late-work loophole where a file is swapped after marking starts. |
| Who can submit? | Only students with status Enrolled, and only for modules in their own programme. | Withdrawn, Deferred and Completed students should not be adding work. |
| Grade scale | Whole numbers 0 to 100. | Avoids rounding ambiguity at the 40, 60 and 70 boundaries. |
| Below 40 | Classified as Fail. | The brief defines Pass, Merit, Distinction only. A grade of 39 still needs a label. |
| Can staff grade a student who has not submitted? | No. Staff see non-submitters listed as "Not submitted" but cannot enter a grade for them. | A grade without a submission is almost always a data entry mistake. Out of scope: recording deliberate zeros. |
| Editing a grade after it is published | Allowed, but it automatically unpublishes that grade and the UI warns staff first. The old value is kept in the audit log. | A student should never see a number that staff have since changed without re-confirming it. |
| Currency | Single currency, set in one constants file (seeded as GBP). | Multi-currency is out of scope and would add rounding and exchange-rate questions with no value for this brief. |
| Academic year | Stored as the starting year (for example 2025, displayed as 2025/26). | Keeps filtering simple and drives the Student ID year. |

## 4. Data model decisions

The full schema is in `prisma/schema.prisma`. The choices that matter:

- **Balance is derived, never stored.** Outstanding balance equals total fee charges minus total payments, computed in a query. A stored balance can disagree with the ledger, so it does not exist.
- **Money is stored as integer minor units** (pence/cents), never floats. Display formatting happens in one helper.
- **Fee amount is snapshotted onto the student.** A programme has a base fee. When a student is enrolled, a `FeeCharge` row is created with that amount and a due date. If the programme fee changes next year, existing students are not silently re-priced. The model supports several charges per student (for example instalments) even though the UI creates one at enrolment, because overdue logic should not break the day a second charge appears.
- **Payments are immutable.** There is no edit or delete. A mistake is corrected by a reversal entry (a negative payment that references the original). Reference numbers are unique, so the same bank transfer cannot be recorded twice.
- **Student ID generation is race safe.** A counter row per year is incremented inside a database transaction, so two admins creating students at the same instant cannot receive the same ID. Format: `SMS-{year}-{0001}`.
- **Students are never hard deleted.** "Removal" means status Withdrawn. Fees, payments, submissions and grades stay attached to the record.
- **Status changes are recorded.** Every status change writes a row with who, when, from, to, and an optional reason, so the Registry can answer "when did this student defer?".
- **Programme to Module to Assessment.** Modules belong to a programme. Assessments belong to a module. This is what lets a student see only the work that applies to them.
- **Submission:** unique on (student, assessment). `isLate` is computed and stored at submit time, so moving a deadline later does not rewrite history. `submittedAt` is stored in UTC.
- **Grade:** unique on (student, assessment). Has `isPublished`, `publishedAt` and `publishedBy`. The classification label is not stored. It is computed from one constants file so the thresholds live in one place.
- **Audit log:** a small generic table for sensitive actions (payment reversal, grade change, publish and unpublish, status change). Cheap to add now, painful to retrofit.

## 5. Business rules by module

### Enrolment
- Required: full name, email, date of birth, programme, academic year, status.
- Email must be unique. Date of birth must be in the past and within a sensible age range.
- Status transitions are restricted:
  - Enrolled can become Deferred, Withdrawn, or Completed
  - Deferred can become Enrolled or Withdrawn
  - Withdrawn can become Enrolled (re-admission), with a reason
  - Completed is final
- Search by name, ID or email. Filter by programme and status. Results are paginated.

### Fees and payments
- A fee charge is created automatically from the programme when a student is enrolled.
- Payment amount must be a positive integer. Reference must be unique and non-empty.
- A payment larger than the outstanding balance is rejected with a clear message rather than creating a hidden credit.
- **Overdue definition:** a student is overdue when the total of charges whose due date has passed exceeds total payments. Payments are applied to the oldest charge first. Overdue amount and days overdue (measured from the oldest uncovered due date) are shown on the dashboard.
- Withdrawn students who still owe money stay visible on the overdue list with a status badge, because the debt does not disappear when the student leaves.

### Assessment submission
- Staff create assessments with title, module and deadline. A deadline in the past is rejected at creation.
- Upload accepts PDF and DOCX only, with a size limit. Validation is server side: extension, MIME type and file signature (magic bytes), not just the filename.
- Files are stored with a random generated name. The original filename is kept as metadata. Files are served only through an authorised route, never from a public folder.
- Late submissions are flagged for both staff and the student, with how late they were.

### Marksheet and results
- Classification: 70 and above Distinction, 60 and above Merit, 40 and above Pass, otherwise Fail.
- Publish and withhold are per grade, with a bulk "publish all for this assessment" shortcut for staff.
- **Withheld results are enforced in the API.** The student endpoints query only published grades and the response contains nothing about unpublished ones, so a student calling the endpoint directly learns nothing. The UI shows "Result pending" for submitted work whose grade is not yet published.

## 6. Edge cases handled on purpose

- Overdue flag with amount and days overdue
- Overpayment, zero payment, negative payment, duplicate reference
- Payment mistakes corrected by reversal, not edit
- Duplicate email on enrolment
- Concurrent student creation (no duplicate IDs)
- Illegal status transitions
- Submission after deadline, resubmission before the deadline, resubmission blocked after
- Wrong file type, oversized file, a file with a renamed extension
- Submission by a non-Enrolled student or for a module outside their programme
- Grades of -1, 101, 55.5, and exactly 39, 40, 59, 60, 69, 70
- Editing a published grade
- Student requesting another student's grade, file or balance (returns not found)
- Deadlines compared in UTC on the server, displayed in the viewer's local time

## 7. Technical choices

- Next.js App Router with route handlers for the API and server components for reads.
- Prisma with PostgreSQL. All multi-step writes (student plus ID counter plus fee charge, payment plus audit entry) run in transactions.
- Zod validation on every route input, with one consistent error response shape (status code, message, field errors).
- Business rules (balance, overdue, classification, late flag, status transitions) live in pure functions under `lib/domain`, separate from routes and UI. This keeps them testable and keeps routes thin.
- Unit tests (Vitest) cover those pure functions, especially the boundary cases above.
- Tailwind with shadcn/ui for the interface.
- Seed data is deliberate rather than random: an overdue student, a fully paid student, a deferred student, a late submission, a withheld result, a Distinction, and a borderline 40.

## 8. Role separation

Auth is optional in the brief, so I use a role switcher backed by a cookie that selects a seeded Staff user or a specific seeded Student. Every API route reads the role from the cookie on the server and checks it before doing anything, so hiding a button in the UI is never the only protection. This is a stand-in for real authentication, not a security feature. In production I would replace it with a proper auth provider and session, and the same server-side checks would carry over.

## 9. Deliberately out of scope

- Real authentication, password reset and email notifications
- Payment gateway integration and receipts
- Multi-currency and instalment plan UI
- Submission version history (only the latest file is kept before the deadline)
- Plagiarism checks, marking rubrics, moderation workflows
- Cloud file storage (files are stored locally here, and object storage such as S3 is the production path)

## 10. What I would do next

1. Real authentication with per-user permissions and an admin audit view.
2. Cloud file storage with virus scanning on upload.
3. Instalment plans, fee waivers and scholarships on top of the existing charge model.
4. Email reminders for overdue fees and approaching deadlines.
5. A second-marker and moderation step before results can be published.

## 11. AI usage

Covered in the README under "How I used AI", including where the output was wrong and what I changed.
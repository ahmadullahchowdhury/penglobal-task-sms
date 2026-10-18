/*
 * Demo data. Every edge case the Registry cares about is already in here, so a
 * reviewer can open the app and see it working. Safe to run more than once: each
 * record is looked up first and left alone if it exists.
 *
 * Switch to any of these with the "Viewing as" menu.
 *
 * Users
 *   Amira Rahman   Registry Admin (students, fees, dashboard)
 *   Daniel Okoye   Staff (assessments, submissions, marksheet)
 *
 * Students, and the case each one demonstrates
 *   Priya Nair       BSc CS   Overdue on fees with a partial payment (about 40 days).
 *                             Graded exactly 40 on Programming Project (a Pass).
 *   Marcus Bell      BSc CS   Fully paid. Published 78 on Programming Project (Distinction).
 *   Elena Rossi      BA Bus   Deferred, with a status history entry and a reason.
 *   Tomasz Kowalski  BA Bus   Withdrawn but still owes money (about 60 days overdue), so he
 *                             stays on the overdue list with a Withdrawn badge.
 *   Aisha Khan       BSc CS   A payment that was reversed (bounced cheque), then another
 *                             payment. Graded 66 on Programming Project but the grade is
 *                             WITHHELD, so she sees "Result pending".
 *   Liam O'Connor    BSc CS   Late submission on Programming Project (2 days 5 hours late).
 *   Sofia Almeida    BA Bus   On-time submission on Management Case Study.
 *                             Published 59, just under the Merit boundary (a Pass).
 *   Noah Fischer     BSc CS   Did not submit Programming Project (a "Not submitted" row
 *                             on the marksheet). Fees only about 5 days overdue, nothing paid.
 *
 * Assessments
 *   Programming Project     CS101   Closed, has submissions and grades.
 *   Database Design Report  CS102   OPEN with NO submissions yet: students can submit.
 *   Management Case Study   BUS101  Closed, one submission and a grade.
 *   Marketing Plan          BUS102  Draft: students never see it.
 *
 * If the seed is interrupted half way, run `npm run db:reset` for a clean start.
 */
import "dotenv/config";
import { prisma } from "../lib/db";
import { isLateSubmission } from "../lib/domain/late";
import { recordPayment, reversePayment } from "../lib/services/fees";
import { publishGrade, setGrade } from "../lib/services/grades";
import { changeStudentStatus, createStudent } from "../lib/services/students";
import { saveUpload } from "../lib/storage";

const DAY = 86_400_000;
const HOUR = 3_600_000;
const now = Date.now();
const daysFromNow = (d: number) => new Date(now + d * DAY);

// A tiny but valid one-page PDF, so downloaded seed submissions open in a viewer.
function makePdf(text: string): Uint8Array {
  const safe = text.replace(/[()\\]/g, "");
  const stream = `BT /F1 14 Tf 72 720 Td (${safe}) Tj ET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) pdf += `${String(o).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return new TextEncoder().encode(pdf);
}

type StudentSpec = {
  fullName: string;
  email: string;
  dateOfBirth: string;
  programmeCode: string;
  // Days from now until the fee falls due. Negative means it is already overdue.
  feeDueInDays: number;
  payments?: { reference: string; amount: number; reverse?: string }[];
  status?: { to: "DEFERRED" | "WITHDRAWN"; reason: string };
};

const STUDENTS: StudentSpec[] = [
  {
    fullName: "Priya Nair",
    email: "priya.nair@student.sms.demo",
    dateOfBirth: "2004-02-11",
    programmeCode: "BSC-CS",
    feeDueInDays: -40,
    payments: [{ reference: "SEED-PRIYA-1", amount: 300000 }],
  },
  {
    fullName: "Marcus Bell",
    email: "marcus.bell@student.sms.demo",
    dateOfBirth: "2003-07-23",
    programmeCode: "BSC-CS",
    feeDueInDays: -20,
    payments: [{ reference: "SEED-MARCUS-1", amount: 900000 }],
  },
  {
    fullName: "Elena Rossi",
    email: "elena.rossi@student.sms.demo",
    dateOfBirth: "2002-11-05",
    programmeCode: "BA-BUS",
    feeDueInDays: 20,
    status: { to: "DEFERRED", reason: "Medical leave, returning next academic year" },
  },
  {
    fullName: "Tomasz Kowalski",
    email: "tomasz.kowalski@student.sms.demo",
    dateOfBirth: "2001-09-30",
    programmeCode: "BA-BUS",
    feeDueInDays: -60,
    payments: [{ reference: "SEED-TOMASZ-1", amount: 100000 }],
    status: { to: "WITHDRAWN", reason: "Left the programme" },
  },
  {
    fullName: "Aisha Khan",
    email: "aisha.khan@student.sms.demo",
    dateOfBirth: "2004-05-17",
    programmeCode: "BSC-CS",
    feeDueInDays: 10,
    payments: [
      { reference: "SEED-AISHA-1", amount: 200000, reverse: "Cheque bounced" },
      { reference: "SEED-AISHA-2", amount: 100000 },
    ],
  },
  {
    fullName: "Liam O'Connor",
    email: "liam.oconnor@student.sms.demo",
    dateOfBirth: "2003-12-01",
    programmeCode: "BSC-CS",
    feeDueInDays: 15,
  },
  {
    fullName: "Sofia Almeida",
    email: "sofia.almeida@student.sms.demo",
    dateOfBirth: "2004-01-19",
    programmeCode: "BA-BUS",
    feeDueInDays: 25,
    payments: [{ reference: "SEED-SOFIA-1", amount: 400000 }],
  },
  {
    fullName: "Noah Fischer",
    email: "noah.fischer@student.sms.demo",
    dateOfBirth: "2003-03-08",
    programmeCode: "BSC-CS",
    feeDueInDays: -5,
  },
];

const ACADEMIC_YEAR = 2025;

async function main() {
  const admin = await prisma.user.upsert({
    where: { email: "admin@sms.demo" },
    update: {},
    create: { name: "Amira Rahman", email: "admin@sms.demo", role: "REGISTRY_ADMIN" },
  });
  const staff = await prisma.user.upsert({
    where: { email: "staff@sms.demo" },
    update: {},
    create: { name: "Daniel Okoye", email: "staff@sms.demo", role: "STAFF" },
  });

  // Programmes and modules
  const programmes = [
    {
      code: "BSC-CS",
      name: "BSc Computer Science",
      baseFee: 900000,
      modules: [
        { code: "CS101", name: "Introduction to Programming" },
        { code: "CS102", name: "Databases" },
      ],
    },
    {
      code: "BA-BUS",
      name: "BA Business Management",
      baseFee: 850000,
      modules: [
        { code: "BUS101", name: "Principles of Management" },
        { code: "BUS102", name: "Marketing Fundamentals" },
      ],
    },
  ];
  for (const { modules, ...data } of programmes) {
    const programme = await prisma.programme.upsert({
      where: { code: data.code },
      update: {},
      create: data,
    });
    for (const m of modules) {
      await prisma.module.upsert({
        where: { code: m.code },
        update: {},
        create: { ...m, programmeId: programme.id },
      });
    }
  }

  // Students, each with a login for the role switcher
  let createdStudents = 0;
  const studentIds = new Map<string, string>();
  for (const spec of STUDENTS) {
    const existing = await prisma.student.findUnique({ where: { email: spec.email } });
    if (existing) {
      studentIds.set(spec.fullName, existing.id);
      continue;
    }

    const programme = await prisma.programme.findUniqueOrThrow({
      where: { code: spec.programmeCode },
    });
    const student = await createStudent(
      {
        fullName: spec.fullName,
        email: spec.email,
        dateOfBirth: spec.dateOfBirth,
        programmeId: programme.id,
        academicYear: ACADEMIC_YEAR,
      },
      admin.id,
    );

    const user = await prisma.user.upsert({
      where: { email: spec.email },
      update: {},
      create: { name: spec.fullName, email: spec.email, role: "STUDENT" },
    });
    await prisma.student.update({ where: { id: student.id }, data: { userId: user.id } });

    // The fee is created as "due in 30 days"; move it to the date this case needs.
    await prisma.feeCharge.updateMany({
      where: { studentId: student.id },
      data: { dueDate: daysFromNow(spec.feeDueInDays) },
    });

    for (const p of spec.payments ?? []) {
      const payment = await recordPayment(
        student.id,
        { reference: p.reference, amount: p.amount },
        admin.id,
      );
      if (p.reverse) await reversePayment(payment.id, { reason: p.reverse }, admin.id);
    }

    if (spec.status) {
      await changeStudentStatus(
        student.id,
        { toStatus: spec.status.to, reason: spec.status.reason },
        admin.id,
      );
    }

    studentIds.set(spec.fullName, student.id);
    createdStudents += 1;
  }

  // Assessments
  const assessmentSpecs = [
    { key: "cs101", title: "Programming Project", moduleCode: "CS101", state: "CLOSED", deadline: daysFromNow(-21) },
    { key: "cs102", title: "Database Design Report", moduleCode: "CS102", state: "OPEN", deadline: daysFromNow(10) },
    { key: "bus101", title: "Management Case Study", moduleCode: "BUS101", state: "CLOSED", deadline: daysFromNow(-14) },
    { key: "bus102", title: "Marketing Plan", moduleCode: "BUS102", state: "DRAFT", deadline: daysFromNow(30) },
  ] as const;

  const assessments = new Map<string, { id: string; title: string; deadline: Date }>();
  for (const spec of assessmentSpecs) {
    const mod = await prisma.module.findUniqueOrThrow({ where: { code: spec.moduleCode } });
    const existing = await prisma.assessment.findFirst({
      where: { title: spec.title, moduleId: mod.id },
    });
    const assessment =
      existing ??
      (await prisma.assessment.create({
        data: {
          title: spec.title,
          moduleId: mod.id,
          deadline: spec.deadline,
          state: spec.state,
          createdById: staff.id,
        },
      }));
    assessments.set(spec.key, assessment);
  }

  // Submissions. Written directly (not through the upload rules) so closed
  // assessments can have on-time and late work with chosen timestamps.
  const submissionSpecs = [
    { student: "Marcus Bell", assessment: "cs101", offsetMs: -3 * DAY },
    { student: "Priya Nair", assessment: "cs101", offsetMs: -1 * DAY },
    { student: "Aisha Khan", assessment: "cs101", offsetMs: -2 * HOUR },
    { student: "Liam O'Connor", assessment: "cs101", offsetMs: 2 * DAY + 5 * HOUR }, // late
    { student: "Sofia Almeida", assessment: "bus101", offsetMs: -1 * DAY },
  ];
  let createdSubmissions = 0;
  for (const s of submissionSpecs) {
    const studentId = studentIds.get(s.student)!;
    const assessment = assessments.get(s.assessment)!;
    const exists = await prisma.submission.findUnique({
      where: { studentId_assessmentId: { studentId, assessmentId: assessment.id } },
    });
    if (exists) continue;

    const bytes = makePdf(`${s.student} - ${assessment.title} (demo submission)`);
    const storageKey = await saveUpload(bytes, ".pdf");
    const submittedAt = new Date(assessment.deadline.getTime() + s.offsetMs);
    await prisma.submission.create({
      data: {
        studentId,
        assessmentId: assessment.id,
        storageKey,
        originalName: `${assessment.title.toLowerCase().replace(/\s+/g, "-")}.pdf`,
        mimeType: "application/pdf",
        sizeBytes: bytes.length,
        submittedAt,
        isLate: isLateSubmission(submittedAt, assessment.deadline),
      },
    });
    createdSubmissions += 1;
  }

  // Grades, through the same service the app uses so the audit trail is real.
  const gradeSpecs = [
    { student: "Marcus Bell", assessment: "cs101", score: 78, publish: true }, // Distinction
    { student: "Priya Nair", assessment: "cs101", score: 40, publish: true }, // boundary: lowest Pass
    { student: "Liam O'Connor", assessment: "cs101", score: 52, publish: true },
    { student: "Aisha Khan", assessment: "cs101", score: 66, publish: false }, // withheld
    { student: "Sofia Almeida", assessment: "bus101", score: 59, publish: true }, // boundary: just under Merit
  ];
  for (const g of gradeSpecs) {
    const studentId = studentIds.get(g.student)!;
    const assessment = assessments.get(g.assessment)!;
    await setGrade(assessment.id, studentId, g.score, staff.id);
    if (g.publish) await publishGrade(assessment.id, studentId, staff.id);
  }

  console.log(
    `Seed complete: ${createdStudents} new students, ${createdSubmissions} new submissions ` +
      `(${STUDENTS.length} students, ${assessmentSpecs.length} assessments in total).`,
  );
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (err) => {
    console.error(err);
    await prisma.$disconnect();
    process.exit(1);
  });

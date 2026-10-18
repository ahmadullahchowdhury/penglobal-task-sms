import "dotenv/config";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real database, with uploads going to a temp folder.
// Everything it creates uses its own academic year, email domain and title prefix.
const YEAR = 2093;
const EMAIL_DOMAIN = "@grades.test";
const PREFIX = "[grades.test] ";
const hasDb = Boolean(process.env.DATABASE_URL);
const pdf = new TextEncoder().encode("%PDF-1.4\nwork");

describe.skipIf(!hasDb)("grades service", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let grades: typeof import("./grades");
  let submitWork: typeof import("./submissions").submitWork;
  let createStudent: typeof import("./students").createStudent;
  let uploadRoot: string;
  let staffId: string;
  let adminId: string;
  let moduleId: string;
  let programmeId: string;
  let counter = 0;

  async function newStudent() {
    const n = counter++;
    const s = await createStudent(
      {
        fullName: `Grade Test ${n}`,
        email: `s${n}${EMAIL_DOMAIN}`,
        dateOfBirth: "2003-04-05",
        programmeId,
        academicYear: YEAR,
      },
      adminId,
    );
    const user = await prisma.user.create({
      data: { name: s.fullName, email: `u${n}${EMAIL_DOMAIN}`, role: "STUDENT" },
    });
    await prisma.student.update({ where: { id: s.id }, data: { userId: user.id } });
    return { id: s.id, userId: user.id };
  }

  const newAssessment = () =>
    prisma.assessment.create({
      data: {
        title: PREFIX + counter++,
        moduleId,
        deadline: new Date(Date.now() + 7 * 86_400_000),
        state: "OPEN",
        createdById: staffId,
      },
    });

  // A student who has submitted to a fresh assessment.
  async function submitted() {
    const [student, assessment] = await Promise.all([newStudent(), newAssessment()]);
    await submitWork(student.id, assessment.id, {
      name: "work.pdf",
      type: "application/pdf",
      bytes: pdf,
    });
    return { student, assessment };
  }

  async function cleanup() {
    const students = await prisma.student.findMany({
      where: { email: { endsWith: EMAIL_DOMAIN } },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    const assessments = await prisma.assessment.findMany({
      where: { title: { startsWith: PREFIX } },
      select: { id: true },
    });
    const grades = await prisma.grade.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    await prisma.auditLog.deleteMany({ where: { entityId: { in: grades.map((g) => g.id) } } });
    await prisma.grade.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.submission.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.assessment.deleteMany({ where: { id: { in: assessments.map((a) => a.id) } } });
    await prisma.statusChange.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.feeCharge.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
    await prisma.studentIdCounter.deleteMany({ where: { year: YEAR } });
  }

  beforeAll(async () => {
    uploadRoot = await mkdtemp(path.join(os.tmpdir(), "sms-grade-uploads-"));
    process.env.UPLOAD_DIR = uploadRoot;

    ({ prisma } = await import("@/lib/db"));
    grades = await import("./grades");
    ({ submitWork } = await import("./submissions"));
    ({ createStudent } = await import("./students"));

    const mod = await prisma.module.findFirstOrThrow({ where: { code: "CS101" } });
    moduleId = mod.id;
    programmeId = mod.programmeId;
    staffId = (await prisma.user.findFirstOrThrow({ where: { role: "STAFF" } })).id;
    adminId = (await prisma.user.findFirstOrThrow({ where: { role: "REGISTRY_ADMIN" } })).id;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await rm(uploadRoot, { recursive: true, force: true });
  });

  describe("entering grades", () => {
    it("creates an unpublished grade for a student who submitted", async () => {
      const { student, assessment } = await submitted();
      const g = await grades.setGrade(assessment.id, student.id, 72, staffId);
      expect(g).toMatchObject({ score: 72, isPublished: false, publishedAt: null, gradedById: staffId });
    });

    it("refuses a student who has not submitted", async () => {
      const student = await newStudent();
      const assessment = await newAssessment();
      await expect(grades.setGrade(assessment.id, student.id, 50, staffId)).rejects.toMatchObject({
        status: 422,
        code: "NOT_SUBMITTED",
      });
      expect(await prisma.grade.count({ where: { studentId: student.id } })).toBe(0);
    });

    it("returns 404 for an unknown assessment or student", async () => {
      const { student, assessment } = await submitted();
      await expect(grades.setGrade("nope", student.id, 50, staffId)).rejects.toMatchObject({ status: 404 });
      await expect(grades.setGrade(assessment.id, "nope", 50, staffId)).rejects.toMatchObject({ status: 404 });
    });

    it("keeps the database range check as a backstop", async () => {
      const { student, assessment } = await submitted();
      await expect(
        prisma.grade.create({
          data: { studentId: student.id, assessmentId: assessment.id, score: 101, gradedById: staffId },
        }),
      ).rejects.toThrow();
      await expect(
        prisma.grade.create({
          data: { studentId: student.id, assessmentId: assessment.id, score: -1, gradedById: staffId },
        }),
      ).rejects.toThrow();
    });

    it("accepts the boundary scores 0 and 100", async () => {
      const a = await submitted();
      const b = await submitted();
      expect((await grades.setGrade(a.assessment.id, a.student.id, 0, staffId)).score).toBe(0);
      expect((await grades.setGrade(b.assessment.id, b.student.id, 100, staffId)).score).toBe(100);
    });

    it("updates an unpublished grade and audits the previous value", async () => {
      const { student, assessment } = await submitted();
      const first = await grades.setGrade(assessment.id, student.id, 55, staffId);
      const updated = await grades.setGrade(assessment.id, student.id, 61, staffId);
      expect(updated.score).toBe(61);

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: first.id, action: "GRADE_UPDATED" },
      });
      expect(audit.metadata).toMatchObject({
        before: { score: 55, isPublished: false },
        after: { score: 61, isPublished: false },
      });
    });

    it("an unchanged score does nothing, so a published grade stays published", async () => {
      const { student, assessment } = await submitted();
      await grades.setGrade(assessment.id, student.id, 65, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);
      const again = await grades.setGrade(assessment.id, student.id, 65, staffId);
      expect(again.isPublished).toBe(true);
    });

    it("withholds a published grade when its score changes, and records the old value", async () => {
      const { student, assessment } = await submitted();
      const g = await grades.setGrade(assessment.id, student.id, 65, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);

      const changed = await grades.setGrade(assessment.id, student.id, 40, staffId);
      expect(changed).toMatchObject({ score: 40, isPublished: false, publishedAt: null, publishedById: null });

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: g.id, action: "GRADE_UPDATED" },
      });
      expect(audit.metadata).toMatchObject({
        before: { score: 65, isPublished: true },
        after: { score: 40, isPublished: false },
      });
    });
  });

  describe("publishing", () => {
    it("publishes with who and when, and writes an audit entry", async () => {
      const { student, assessment } = await submitted();
      const g = await grades.setGrade(assessment.id, student.id, 70, staffId);
      const published = await grades.publishGrade(assessment.id, student.id, staffId);

      expect(published).toMatchObject({ isPublished: true, publishedById: staffId });
      expect(published.publishedAt).toBeInstanceOf(Date);
      expect(
        await prisma.auditLog.count({ where: { entityId: g.id, action: "GRADE_PUBLISHED" } }),
      ).toBe(1);
    });

    it("publishing twice is a no-op with one audit entry", async () => {
      const { student, assessment } = await submitted();
      const g = await grades.setGrade(assessment.id, student.id, 70, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);
      expect(
        await prisma.auditLog.count({ where: { entityId: g.id, action: "GRADE_PUBLISHED" } }),
      ).toBe(1);
    });

    it("withholds a published grade", async () => {
      const { student, assessment } = await submitted();
      await grades.setGrade(assessment.id, student.id, 70, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);
      const w = await grades.withholdGrade(assessment.id, student.id, staffId);
      expect(w).toMatchObject({ isPublished: false, publishedAt: null, publishedById: null });
    });

    it("cannot publish or withhold a grade that does not exist", async () => {
      const { student, assessment } = await submitted();
      await expect(grades.publishGrade(assessment.id, student.id, staffId)).rejects.toMatchObject({ status: 404 });
      await expect(grades.withholdGrade(assessment.id, student.id, staffId)).rejects.toMatchObject({ status: 404 });
    });

    it("bulk publishes every graded, withheld grade and leaves ungraded work alone", async () => {
      const assessment = await newAssessment();
      const students = await Promise.all([newStudent(), newStudent(), newStudent()]);
      for (const s of students) {
        await submitWork(s.id, assessment.id, { name: "w.pdf", type: "application/pdf", bytes: pdf });
      }
      await grades.setGrade(assessment.id, students[0].id, 80, staffId);
      await grades.setGrade(assessment.id, students[1].id, 45, staffId);
      // students[2] is submitted but not graded

      expect(await grades.publishAllGrades(assessment.id, staffId)).toEqual({ published: 2 });
      expect(await prisma.grade.count({ where: { assessmentId: assessment.id, isPublished: true } })).toBe(2);
      expect(await prisma.grade.count({ where: { assessmentId: assessment.id } })).toBe(2);

      // a second run has nothing left to do
      expect(await grades.publishAllGrades(assessment.id, staffId)).toEqual({ published: 0 });
      await expect(grades.publishAllGrades("nope", staffId)).rejects.toMatchObject({ status: 404 });
    });
  });

  describe("student results never leak withheld grades", () => {
    it("omits an unpublished grade from the results, and includes it once published", async () => {
      const { student, assessment } = await submitted();
      await grades.setGrade(assessment.id, student.id, 73, staffId);

      let results = await grades.getResultsForStudentUser(student.userId);
      expect(results).toEqual([]);
      expect(JSON.stringify(results)).not.toContain(assessment.id);

      await grades.publishGrade(assessment.id, student.id, staffId);
      results = await grades.getResultsForStudentUser(student.userId);
      expect(results).toHaveLength(1);
      expect(results[0]).toMatchObject({
        assessmentId: assessment.id,
        score: 73,
        classification: "Distinction",
      });

      await grades.withholdGrade(assessment.id, student.id, staffId);
      expect(await grades.getResultsForStudentUser(student.userId)).toEqual([]);
    });

    it("a grade withheld by an edit disappears from the results straight away", async () => {
      const { student, assessment } = await submitted();
      await grades.setGrade(assessment.id, student.id, 65, staffId);
      await grades.publishGrade(assessment.id, student.id, staffId);
      expect(await grades.getResultsForStudentUser(student.userId)).toHaveLength(1);

      await grades.setGrade(assessment.id, student.id, 38, staffId);
      const results = await grades.getResultsForStudentUser(student.userId);
      expect(results).toEqual([]);
      expect(JSON.stringify(results)).not.toContain('"score"');
    });

    it("another student's id is not found, and so is a user with no student record", async () => {
      const a = await newStudent();
      const b = await newStudent();
      await expect(grades.getResultsForStudentUser(a.userId, b.id)).rejects.toMatchObject({ status: 404 });
      await expect(grades.getResultsForStudentUser(a.userId, a.id)).resolves.toEqual([]);
      await expect(grades.getResultsForStudentUser(staffId)).rejects.toMatchObject({ status: 404 });
    });

    it("the results page view shows submitted work as pending, with no score", async () => {
      const { student, assessment } = await submitted();
      await grades.setGrade(assessment.id, student.id, 91, staffId);

      let view = await grades.getStudentResultsView(student.id);
      expect(view.published).toEqual([]);
      expect(view.pending.map((p) => p.assessmentId)).toEqual([assessment.id]);
      expect(JSON.stringify(view)).not.toContain('"score"');
      // graded-but-withheld and not-yet-graded look identical to the student
      const ungraded = await submitted();
      const other = await grades.getStudentResultsView(ungraded.student.id);
      expect(Object.keys(other.pending[0]).sort()).toEqual(Object.keys(view.pending[0]).sort());

      await grades.publishGrade(assessment.id, student.id, staffId);
      view = await grades.getStudentResultsView(student.id);
      expect(view.pending).toEqual([]);
      expect(view.published[0]).toMatchObject({ score: 91, classification: "Distinction" });
    });
  });

  it("builds a marksheet with submitters, their grades and the students who did not submit", async () => {
    const assessment = await newAssessment();
    const [graded, ungraded, missing] = await Promise.all([newStudent(), newStudent(), newStudent()]);
    for (const s of [graded, ungraded]) {
      await submitWork(s.id, assessment.id, { name: "w.pdf", type: "application/pdf", bytes: pdf });
    }
    await grades.setGrade(assessment.id, graded.id, 66, staffId);

    const sheet = await grades.getMarksheet(assessment.id);
    const byId = new Map(sheet.rows.map((r) => [r.student.id, r]));
    expect(byId.get(graded.id)?.grade).toMatchObject({ score: 66, isPublished: false });
    expect(byId.get(ungraded.id)?.grade).toBeNull();
    expect(sheet.rows.map((r) => r.student.id)).not.toContain(missing.id);
    expect(sheet.notSubmitted.map((s) => s.id)).toContain(missing.id);
    await expect(grades.getMarksheet("nope")).rejects.toMatchObject({ status: 404 });
  });
});

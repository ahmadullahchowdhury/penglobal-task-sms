import "dotenv/config";
import { existsSync } from "node:fs";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real database, with uploads going to a temp folder.
// Everything it creates uses its own academic year, email domain and title prefix.
const YEAR = 2092;
const EMAIL_DOMAIN = "@submissions.test";
const PREFIX = "[submissions.test] ";
const PDF_MIME = "application/pdf";
const hasDb = Boolean(process.env.DATABASE_URL);

const pdf = (text = "hello") => new TextEncoder().encode(`%PDF-1.4\n${text}`);
const day = 86_400_000;

describe.skipIf(!hasDb)("submissions service", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let svc: typeof import("./submissions");
  let createStudent: typeof import("./students").createStudent;
  let uploadRoot: string;
  let actorId: string;
  let moduleId: string;
  let otherProgrammeId: string;
  let ownProgrammeId: string;
  let counter = 0;

  const file = (name = "essay.pdf", bytes = pdf()) => ({ name, type: PDF_MIME, bytes });

  async function newStudent(programmeId = ownProgrammeId, withUser = false) {
    const n = counter++;
    const s = await createStudent(
      {
        fullName: `Sub Test ${n}`,
        email: `s${n}${EMAIL_DOMAIN}`,
        dateOfBirth: "2003-04-05",
        programmeId,
        academicYear: YEAR,
      },
      actorId,
    );
    if (!withUser) return { ...s, userId: null as string | null };
    const user = await prisma.user.create({
      data: { name: s.fullName, email: `u${n}${EMAIL_DOMAIN}`, role: "STUDENT" },
    });
    await prisma.student.update({ where: { id: s.id }, data: { userId: user.id } });
    return { ...s, userId: user.id };
  }

  const newAssessment = (
    state: "DRAFT" | "OPEN" | "CLOSED" = "OPEN",
    deadlineOffsetMs = 7 * day,
    forModule = moduleId,
  ) =>
    prisma.assessment.create({
      data: {
        title: PREFIX + counter++,
        moduleId: forModule,
        deadline: new Date(Date.now() + deadlineOffsetMs),
        state,
        createdById: actorId,
      },
    });

  const filesOnDisk = () => readdir(uploadRoot);
  const onDisk = (key: string) => existsSync(path.join(uploadRoot, key));

  async function cleanup() {
    const students = await prisma.student.findMany({
      where: { email: { endsWith: EMAIL_DOMAIN } },
      select: { id: true },
    });
    const ids = students.map((s) => s.id);
    await prisma.submission.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.assessment.deleteMany({ where: { title: { startsWith: PREFIX } } });
    await prisma.statusChange.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.feeCharge.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
    await prisma.studentIdCounter.deleteMany({ where: { year: YEAR } });
  }

  beforeAll(async () => {
    uploadRoot = await mkdtemp(path.join(os.tmpdir(), "sms-uploads-"));
    process.env.UPLOAD_DIR = uploadRoot;

    ({ prisma } = await import("@/lib/db"));
    svc = await import("./submissions");
    ({ createStudent } = await import("./students"));

    const mod = await prisma.module.findFirstOrThrow({ where: { code: "CS101" } });
    moduleId = mod.id;
    ownProgrammeId = mod.programmeId;
    otherProgrammeId = (
      await prisma.programme.findFirstOrThrow({ where: { id: { not: ownProgrammeId } } })
    ).id;
    actorId = (await prisma.user.findFirstOrThrow({ where: { role: "REGISTRY_ADMIN" } })).id;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
    await rm(uploadRoot, { recursive: true, force: true });
  });

  it("stores an on-time first submission under a random name", async () => {
    const s = await newStudent();
    const a = await newAssessment();
    const sub = await svc.submitWork(s.id, a.id, file("My Essay.pdf"));

    expect(sub).toMatchObject({
      isLate: false,
      originalName: "My Essay.pdf",
      mimeType: PDF_MIME,
      studentId: s.id,
    });
    expect(sub.storageKey).toMatch(/^[0-9a-f-]{36}\.pdf$/);
    expect(onDisk(sub.storageKey)).toBe(true);
  });

  it("replaces the file before the deadline and deletes the old one", async () => {
    const s = await newStudent();
    const a = await newAssessment();
    const first = await svc.submitWork(s.id, a.id, file("v1.pdf", pdf("one")));
    const second = await svc.submitWork(s.id, a.id, file("v2.pdf", pdf("two")));

    expect(second.id).toBe(first.id);
    expect(second.storageKey).not.toBe(first.storageKey);
    expect(second.originalName).toBe("v2.pdf");
    expect(second.isLate).toBe(false);
    expect(onDisk(first.storageKey)).toBe(false);
    expect(onDisk(second.storageKey)).toBe(true);
    expect(await prisma.submission.count({ where: { studentId: s.id, assessmentId: a.id } })).toBe(1);
  });

  it("accepts a first submission after the deadline and flags it late", async () => {
    const s = await newStudent();
    const a = await newAssessment("OPEN", -2 * 3_600_000);
    const sub = await svc.submitWork(s.id, a.id, file());
    expect(sub.isLate).toBe(true);
  });

  it("blocks replacing after the deadline and leaves the original untouched", async () => {
    const s = await newStudent();
    const a = await newAssessment();
    const first = await svc.submitWork(s.id, a.id, file("v1.pdf"));
    await prisma.assessment.update({
      where: { id: a.id },
      data: { deadline: new Date(Date.now() - 3_600_000) },
    });

    const before = await filesOnDisk();
    await expect(svc.submitWork(s.id, a.id, file("v2.pdf"))).rejects.toMatchObject({
      status: 422,
      code: "RESUBMISSION_LOCKED",
    });
    expect(await filesOnDisk()).toEqual(before);

    const row = await prisma.submission.findUniqueOrThrow({ where: { id: first.id } });
    expect(row).toMatchObject({ storageKey: first.storageKey, originalName: "v1.pdf", isLate: false });
    expect(onDisk(first.storageKey)).toBe(true);
  });

  it("does not recompute isLate when the deadline is moved later", async () => {
    const s = await newStudent();
    const a = await newAssessment("OPEN", -3_600_000);
    const sub = await svc.submitWork(s.id, a.id, file());
    await prisma.assessment.update({
      where: { id: a.id },
      data: { deadline: new Date(Date.now() + 7 * day) },
    });
    expect((await prisma.submission.findUniqueOrThrow({ where: { id: sub.id } })).isLate).toBe(true);
  });

  it("rejects a renamed .exe and leaves no row or file behind", async () => {
    const s = await newStudent();
    const a = await newAssessment();
    const before = await filesOnDisk();
    const exe = new Uint8Array([0x4d, 0x5a, 0x90, 0x00, 0x03]);

    await expect(svc.submitWork(s.id, a.id, file("setup.pdf", exe))).rejects.toMatchObject({
      status: 400,
      code: "SIGNATURE_MISMATCH",
    });
    await expect(
      svc.submitWork(s.id, a.id, { name: "setup.exe", type: "application/x-msdownload", bytes: exe }),
    ).rejects.toMatchObject({ code: "UNSUPPORTED_TYPE" });

    expect(await prisma.submission.count({ where: { studentId: s.id } })).toBe(0);
    expect(await filesOnDisk()).toEqual(before);
  });

  it("rejects a student who is not enrolled", async () => {
    const s = await newStudent();
    await prisma.student.update({ where: { id: s.id }, data: { status: "DEFERRED" } });
    const a = await newAssessment();
    await expect(svc.submitWork(s.id, a.id, file())).rejects.toMatchObject({
      status: 403,
      code: "NOT_ENROLLED",
    });
  });

  it("treats a module in another programme and a draft as not found", async () => {
    const outsider = await newStudent(otherProgrammeId);
    const insider = await newStudent();
    const open = await newAssessment();
    const draft = await newAssessment("DRAFT");

    await expect(svc.submitWork(outsider.id, open.id, file())).rejects.toMatchObject({ status: 404 });
    await expect(svc.submitWork(insider.id, draft.id, file())).rejects.toMatchObject({ status: 404 });
  });

  it("rejects submissions to a closed assessment", async () => {
    const s = await newStudent();
    const a = await newAssessment("CLOSED");
    await expect(svc.submitWork(s.id, a.id, file())).rejects.toMatchObject({
      status: 422,
      code: "NOT_OPEN",
    });
  });

  it("lets only one of two simultaneous first submissions through, with no orphan file", async () => {
    const s = await newStudent();
    const a = await newAssessment();
    const results = await Promise.allSettled([
      svc.submitWork(s.id, a.id, file("a.pdf", pdf("a"))),
      svc.submitWork(s.id, a.id, file("b.pdf", pdf("b"))),
    ]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ status: 409 });

    const rows = await prisma.submission.findMany({ where: { assessmentId: a.id } });
    expect(rows).toHaveLength(1);
    expect(onDisk(rows[0].storageKey)).toBe(true);
  });

  it("authorises downloads: staff any file, a student only their own", async () => {
    const owner = await newStudent(ownProgrammeId, true);
    const other = await newStudent(ownProgrammeId, true);
    const a = await newAssessment();
    const sub = await svc.submitWork(owner.id, a.id, file("mine.pdf", pdf("secret")));

    const staff = { id: actorId, role: "STAFF" as const };
    expect((await svc.getSubmissionFile(sub.id, staff)).originalName).toBe("mine.pdf");

    const own = await svc.getSubmissionFile(sub.id, { id: owner.userId!, role: "STUDENT" });
    expect(Buffer.from(own.bytes).toString()).toContain("secret");

    await expect(
      svc.getSubmissionFile(sub.id, { id: other.userId!, role: "STUDENT" }),
    ).rejects.toMatchObject({ status: 404 });
    await expect(svc.getSubmissionFile("nope", staff)).rejects.toMatchObject({ status: 404 });
  });

  it("lists non-drafts for the student's programme, and who has not submitted for staff", async () => {
    const done = await newStudent();
    const missing = await newStudent();
    const a = await newAssessment();
    const draft = await newAssessment("DRAFT");
    await svc.submitWork(done.id, a.id, file());

    const mine = await svc.listAssessmentsForStudent(done.id);
    expect(mine.find((x) => x.id === a.id)?.submissions).toHaveLength(1);
    expect(mine.find((x) => x.id === draft.id)).toBeUndefined();

    const theirs = await svc.listAssessmentsForStudent(missing.id);
    expect(theirs.find((x) => x.id === a.id)?.submissions).toHaveLength(0);

    const view = await svc.getAssessmentSubmissions(a.id);
    expect(view.submissions.map((s) => s.student.id)).toContain(done.id);
    expect(view.notSubmitted.map((s) => s.id)).toContain(missing.id);
    expect(view.notSubmitted.map((s) => s.id)).not.toContain(done.id);
  });

  it("leaves no stray files: everything on disk belongs to a submission row", async () => {
    const rows = await prisma.submission.findMany({
      where: { assessment: { title: { startsWith: PREFIX } } },
      select: { storageKey: true },
    });
    expect((await filesOnDisk()).sort()).toEqual(rows.map((r) => r.storageKey).sort());
  });
});

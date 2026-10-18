import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real database. It uses its own academic year and
// email domain, and removes only the rows it created.
const YEAR = 2090;
const EMAIL_DOMAIN = "@concurrency.test";
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("createStudent", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let createStudent: typeof import("./students").createStudent;
  let changeStudentStatus: typeof import("./students").changeStudentStatus;
  let programmeId: string;
  let actorId: string;

  async function cleanup() {
    const students = await prisma.student.findMany({
      where: { email: { endsWith: EMAIL_DOMAIN } },
      select: { id: true },
    });
    const ids = students.map((s) => s.id);
    await prisma.auditLog.deleteMany({ where: { entityType: "Student", entityId: { in: ids } } });
    await prisma.statusChange.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.feeCharge.deleteMany({ where: { studentId: { in: ids } } });
    await prisma.student.deleteMany({ where: { id: { in: ids } } });
    await prisma.studentIdCounter.deleteMany({ where: { year: YEAR } });
  }

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db"));
    ({ createStudent, changeStudentStatus } = await import("./students"));
    const programme = await prisma.programme.findFirstOrThrow();
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "REGISTRY_ADMIN" } });
    programmeId = programme.id;
    actorId = admin.id;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const input = (n: number) => ({
    fullName: `Student ${n}`,
    email: `s${n}${EMAIL_DOMAIN}`,
    dateOfBirth: "2003-04-05",
    programmeId,
    academicYear: YEAR,
  });

  it("issues unique, gap-free ids to 20 concurrent creations", async () => {
    const created = await Promise.all(
      Array.from({ length: 20 }, (_, i) => createStudent(input(i), actorId)),
    );

    const numbers = created.map((s) => s.studentNumber);
    expect(new Set(numbers).size).toBe(20);

    const expected = Array.from({ length: 20 }, (_, i) => `SMS-${YEAR}-${String(i + 1).padStart(4, "0")}`);
    expect([...numbers].sort()).toEqual(expected);
  });

  it("writes the initial status and a fee charge snapshot", async () => {
    const student = await prisma.student.findFirstOrThrow({
      where: { email: `s0${EMAIL_DOMAIN}` },
      include: { statusHistory: true, feeCharges: true, programme: true },
    });
    expect(student.status).toBe("ENROLLED");
    expect(student.statusHistory).toHaveLength(1);
    expect(student.statusHistory[0]).toMatchObject({ fromStatus: null, toStatus: "ENROLLED" });
    expect(student.feeCharges).toHaveLength(1);
    expect(student.feeCharges[0].amount).toBe(student.programme.baseFee);
  });

  it("rejects a duplicate email and does not burn a sequence number", async () => {
    await expect(createStudent(input(0), actorId)).rejects.toMatchObject({
      status: 409,
      code: "EMAIL_TAKEN",
    });
    const next = await createStudent(input(100), actorId);
    expect(next.studentNumber).toBe(`SMS-${YEAR}-0021`);
  });

  it("enrols as Enrolled by default and records that as the first history entry", async () => {
    const s = await createStudent(input(300), actorId);
    expect(s.status).toBe("ENROLLED");
    const history = await prisma.statusChange.findMany({ where: { studentId: s.id } });
    expect(history.map((h) => [h.fromStatus, h.toStatus])).toEqual([[null, "ENROLLED"]]);
  });

  it("can enrol a student as Deferred from the start, still with a fee charge", async () => {
    const s = await createStudent({ ...input(301), status: "DEFERRED" }, actorId);
    expect(s.status).toBe("DEFERRED");
    const full = await prisma.student.findUniqueOrThrow({
      where: { id: s.id },
      include: { statusHistory: true, feeCharges: true },
    });
    expect(full.statusHistory.map((h) => [h.fromStatus, h.toStatus])).toEqual([[null, "DEFERRED"]]);
    expect(full.feeCharges).toHaveLength(1);
  });

  describe("changeStudentStatus", () => {
    const fresh = (n: number) => createStudent(input(200 + n), actorId);

    it("records history and an audit entry for a legal change", async () => {
      const s = await fresh(1);
      const updated = await changeStudentStatus(
        s.id,
        { toStatus: "DEFERRED", reason: "Illness" },
        actorId,
      );
      expect(updated.status).toBe("DEFERRED");

      const history = await prisma.statusChange.findMany({
        where: { studentId: s.id },
        orderBy: { createdAt: "asc" },
      });
      expect(history.map((h) => [h.fromStatus, h.toStatus])).toEqual([
        [null, "ENROLLED"],
        ["ENROLLED", "DEFERRED"],
      ]);
      expect(history[1]).toMatchObject({ reason: "Illness", changedById: actorId });

      const audit = await prisma.auditLog.findFirstOrThrow({
        where: { entityId: s.id, action: "STUDENT_STATUS_CHANGED" },
      });
      expect(audit.metadata).toEqual({ from: "ENROLLED", to: "DEFERRED", reason: "Illness" });
    });

    it("rejects an illegal transition and changes nothing", async () => {
      const s = await fresh(2);
      await changeStudentStatus(s.id, { toStatus: "COMPLETED" }, actorId);
      await expect(
        changeStudentStatus(s.id, { toStatus: "ENROLLED" }, actorId),
      ).rejects.toMatchObject({ status: 422, code: "ILLEGAL_TRANSITION" });

      const after = await prisma.student.findUniqueOrThrow({ where: { id: s.id } });
      expect(after.status).toBe("COMPLETED");
      expect(await prisma.statusChange.count({ where: { studentId: s.id } })).toBe(2);
    });

    it("requires a reason to re-admit a withdrawn student", async () => {
      const s = await fresh(3);
      await changeStudentStatus(s.id, { toStatus: "WITHDRAWN" }, actorId);
      await expect(
        changeStudentStatus(s.id, { toStatus: "ENROLLED" }, actorId),
      ).rejects.toMatchObject({ status: 400, fields: { reason: expect.any(Array) } });

      const back = await changeStudentStatus(
        s.id,
        { toStatus: "ENROLLED", reason: "Appeal upheld" },
        actorId,
      );
      expect(back.status).toBe("ENROLLED");
    });

    it("returns 404 for an unknown student", async () => {
      await expect(
        changeStudentStatus("nope", { toStatus: "DEFERRED" }, actorId),
      ).rejects.toMatchObject({ status: 404 });
    });
  });
});

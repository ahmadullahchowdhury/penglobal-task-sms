import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real database. It uses its own academic year and
// email domain, and removes only the rows it created.
const YEAR = 2091;
const EMAIL_DOMAIN = "@fees.test";
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("fees and payments", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let createStudent: typeof import("./students").createStudent;
  let fees: typeof import("./fees");
  let programmeId: string;
  let baseFee: number;
  let actorId: string;
  let counter = 0;

  async function cleanup() {
    const students = await prisma.student.findMany({
      where: { email: { endsWith: EMAIL_DOMAIN } },
      select: { id: true },
    });
    const studentIds = students.map((s) => s.id);
    const payments = await prisma.payment.findMany({
      where: { studentId: { in: studentIds } },
      select: { id: true },
    });
    const paymentIds = payments.map((p) => p.id);

    await prisma.auditLog.deleteMany({
      where: { entityId: { in: [...studentIds, ...paymentIds] } },
    });
    await prisma.payment.deleteMany({
      where: { studentId: { in: studentIds }, kind: "REVERSAL" },
    });
    await prisma.payment.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.statusChange.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.feeCharge.deleteMany({ where: { studentId: { in: studentIds } } });
    await prisma.student.deleteMany({ where: { id: { in: studentIds } } });
    await prisma.studentIdCounter.deleteMany({ where: { year: YEAR } });
    await prisma.user.deleteMany({ where: { email: { endsWith: EMAIL_DOMAIN } } });
  }

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db"));
    ({ createStudent } = await import("./students"));
    fees = await import("./fees");
    const programme = await prisma.programme.findFirstOrThrow();
    const admin = await prisma.user.findFirstOrThrow({ where: { role: "REGISTRY_ADMIN" } });
    programmeId = programme.id;
    baseFee = programme.baseFee;
    actorId = admin.id;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  const newStudent = () =>
    createStudent(
      {
        fullName: "Fee Test",
        email: `f${counter++}${EMAIL_DOMAIN}`,
        dateOfBirth: "2003-04-05",
        programmeId,
        academicYear: YEAR,
      },
      actorId,
    );

  const ref = () => `T-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const pay = (studentId: string, amount: number, reference = ref()) =>
    fees.recordPayment(studentId, { amount, reference }, actorId);

  it("starts with the programme fee as the balance", async () => {
    const s = await newStudent();
    expect((await fees.getFees(s.id)).balance).toBe(baseFee);
  });

  it("lowers the balance when a payment is recorded", async () => {
    const s = await newStudent();
    await pay(s.id, 100000);
    expect((await fees.getFees(s.id)).balance).toBe(baseFee - 100000);
  });

  it("accepts a payment of exactly the balance", async () => {
    const s = await newStudent();
    await pay(s.id, baseFee);
    expect((await fees.getFees(s.id)).balance).toBe(0);
  });

  it("rejects an overpayment and records nothing", async () => {
    const s = await newStudent();
    await expect(pay(s.id, baseFee + 1)).rejects.toMatchObject({
      status: 422,
      code: "OVERPAYMENT",
    });
    expect(await prisma.payment.count({ where: { studentId: s.id } })).toBe(0);
  });

  it("rejects a payment for a student with nothing outstanding", async () => {
    const s = await newStudent();
    await pay(s.id, baseFee);
    await expect(pay(s.id, 1)).rejects.toMatchObject({ code: "OVERPAYMENT" });
  });

  it("rejects a duplicate reference", async () => {
    const s = await newStudent();
    const reference = ref();
    await pay(s.id, 1000, reference);
    await expect(pay(s.id, 1000, reference)).rejects.toMatchObject({
      status: 409,
      code: "DUPLICATE_REFERENCE",
    });
  });

  it("lets only one of two concurrent payments through when together they overpay", async () => {
    const s = await newStudent();
    const sixty = Math.floor(baseFee * 0.6);
    const results = await Promise.allSettled([pay(s.id, sixty), pay(s.id, sixty)]);

    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult;
    expect(rejected.reason).toMatchObject({ code: "OVERPAYMENT" });
    expect((await fees.getFees(s.id)).balance).toBe(baseFee - sixty);
  });

  it("reversal restores the balance, links to the original and writes an audit entry", async () => {
    const s = await newStudent();
    const payment = await pay(s.id, 250000);
    const reversal = await fees.reversePayment(payment.id, { reason: "Bounced" }, actorId);

    expect(reversal).toMatchObject({
      kind: "REVERSAL",
      amount: -250000,
      reversalOfId: payment.id,
      note: "Bounced",
    });
    const after = await fees.getFees(s.id);
    expect(after.balance).toBe(baseFee);
    expect(after.payments.find((p) => p.id === payment.id)?.isReversed).toBe(true);

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { entityId: payment.id, action: "PAYMENT_REVERSED" },
    });
    expect(audit.metadata).toMatchObject({ amount: 250000, reason: "Bounced" });
  });

  it("rejects a second reversal", async () => {
    const s = await newStudent();
    const payment = await pay(s.id, 1000);
    await fees.reversePayment(payment.id, { reason: "x" }, actorId);
    await expect(fees.reversePayment(payment.id, { reason: "y" }, actorId)).rejects.toMatchObject({
      status: 409,
      code: "ALREADY_REVERSED",
    });
  });

  it("lets only one of two concurrent reversals through", async () => {
    const s = await newStudent();
    const payment = await pay(s.id, 1000);
    const results = await Promise.allSettled([
      fees.reversePayment(payment.id, { reason: "a" }, actorId),
      fees.reversePayment(payment.id, { reason: "b" }, actorId),
    ]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect((await fees.getFees(s.id)).balance).toBe(baseFee);
  });

  it("does not allow a reversal to be reversed", async () => {
    const s = await newStudent();
    const payment = await pay(s.id, 1000);
    const reversal = await fees.reversePayment(payment.id, { reason: "x" }, actorId);
    await expect(fees.reversePayment(reversal.id, { reason: "y" }, actorId)).rejects.toMatchObject({
      status: 422,
      code: "NOT_REVERSIBLE",
    });
  });

  it("reports an overdue amount once the due date has passed", async () => {
    const s = await newStudent();
    const later = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
    const view = await fees.getFees(s.id, later);
    expect(view.overdue.overdueAmount).toBe(baseFee);
    expect(view.overdue.daysOverdue).toBeGreaterThan(0);
  });

  it("lets a student read only their own balance; anyone else's is not found", async () => {
    const mine = await newStudent();
    const theirs = await newStudent();
    const user = await prisma.user.create({
      data: { name: "Fee Owner", email: `owner${counter++}${EMAIL_DOMAIN}`, role: "STUDENT" },
    });
    await prisma.student.update({ where: { id: mine.id }, data: { userId: user.id } });
    const asStudent = { id: user.id, role: "STUDENT" as const };

    expect((await fees.getFeesForUser(asStudent, mine.id)).balance).toBe(baseFee);
    await expect(fees.getFeesForUser(asStudent, theirs.id)).rejects.toMatchObject({ status: 404 });
    await expect(fees.getFeesForUser(asStudent, "nope")).rejects.toMatchObject({ status: 404 });

    // a student user with no student record sees nothing either
    const orphan = await prisma.user.create({
      data: { name: "No Record", email: `orphan${counter++}${EMAIL_DOMAIN}`, role: "STUDENT" },
    });
    await expect(
      fees.getFeesForUser({ id: orphan.id, role: "STUDENT" }, mine.id),
    ).rejects.toMatchObject({ status: 404 });

    // an admin can read any student
    expect((await fees.getFeesForUser({ id: actorId, role: "REGISTRY_ADMIN" }, theirs.id)).balance).toBe(
      baseFee,
    );
  });

  it("returns 404 for an unknown student", async () => {
    await expect(pay("nope", 1000)).rejects.toMatchObject({ status: 404 });
    await expect(fees.getFees("nope")).rejects.toMatchObject({ status: 404 });
  });
});

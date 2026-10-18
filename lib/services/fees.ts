import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { computeBalance, computeOverdue, exceedsBalance } from "@/lib/domain/balance";
import { ApiError } from "@/lib/http";
import { formatMoney } from "@/lib/money";
import type { RecordPaymentInput, ReversePaymentInput } from "@/lib/validation/payments";

// Everything the fees views need for one student. Balance and overdue state are
// computed from the ledger here, never read from a stored column.
export async function getFees(studentId: string, now = new Date()) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      studentNumber: true,
      fullName: true,
      status: true,
      feeCharges: { orderBy: { dueDate: "asc" } },
      payments: {
        orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
        include: { reversedBy: { select: { id: true } } },
      },
    },
  });
  if (!student) throw new ApiError(404, "NOT_FOUND", "Student not found");

  const { feeCharges: charges, payments, ...summary } = student;
  return {
    student: summary,
    charges,
    payments: payments.map(({ reversedBy, ...p }) => ({ ...p, isReversed: reversedBy !== null })),
    balance: computeBalance(charges, payments),
    overdue: computeOverdue(charges, payments, now),
  };
}

function isUniqueViolation(err: unknown): err is Prisma.PrismaClientKnownRequestError {
  return err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";
}

export async function recordPayment(
  studentId: string,
  input: RecordPaymentInput,
  actorId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      // Lock the student row so two payments for the same student are checked
      // against the balance one after the other, never both against the same balance.
      const locked = await tx.$queryRaw<{ id: string }[]>`
        SELECT "id" FROM "Student" WHERE "id" = ${studentId} FOR UPDATE`;
      if (locked.length === 0) throw new ApiError(404, "NOT_FOUND", "Student not found");

      const [charges, payments] = await Promise.all([
        tx.feeCharge.findMany({ where: { studentId }, select: { amount: true, dueDate: true } }),
        tx.payment.findMany({ where: { studentId }, select: { amount: true } }),
      ]);
      const balance = computeBalance(charges, payments);

      if (exceedsBalance(balance, input.amount)) {
        throw new ApiError(
          422,
          "OVERPAYMENT",
          balance === 0
            ? "This student has nothing outstanding, so a payment cannot be recorded"
            : `The payment is more than the outstanding balance of ${formatMoney(balance)}`,
          { amount: [`Cannot be more than ${formatMoney(balance)}`] },
        );
      }

      return tx.payment.create({
        data: {
          studentId,
          kind: "PAYMENT",
          amount: input.amount,
          paidAt: new Date(),
          reference: input.reference,
          note: input.note,
          recordedById: actorId,
        },
      });
    });
  } catch (err) {
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "DUPLICATE_REFERENCE", "This reference has already been recorded", {
        reference: ["This reference has already been used"],
      });
    }
    throw err;
  }
}

// A reversal is a new negative row pointing at the original. Nothing is edited.
export async function reversePayment(
  paymentId: string,
  input: ReversePaymentInput,
  actorId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const original = await tx.payment.findUnique({
        where: { id: paymentId },
        include: { reversedBy: { select: { id: true } } },
      });
      if (!original) throw new ApiError(404, "NOT_FOUND", "Payment not found");
      if (original.kind !== "PAYMENT") {
        throw new ApiError(422, "NOT_REVERSIBLE", "A reversal cannot be reversed");
      }
      if (original.reversedBy) {
        throw new ApiError(409, "ALREADY_REVERSED", "This payment has already been reversed");
      }

      const reversal = await tx.payment.create({
        data: {
          studentId: original.studentId,
          kind: "REVERSAL",
          amount: -original.amount,
          paidAt: new Date(),
          reference: `REV-${original.reference}`,
          note: input.reason,
          reversalOfId: original.id,
          recordedById: actorId,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId,
          action: "PAYMENT_REVERSED",
          entityType: "Payment",
          entityId: original.id,
          metadata: {
            reversalId: reversal.id,
            studentId: original.studentId,
            amount: original.amount,
            reference: original.reference,
            reason: input.reason,
          },
        },
      });

      return reversal;
    });
  } catch (err) {
    // Two reversals racing: the unique reversalOfId lets only one through.
    if (isUniqueViolation(err)) {
      throw new ApiError(409, "ALREADY_REVERSED", "This payment has already been reversed");
    }
    throw err;
  }
}

// Admins can read any student's fees. A student can only read their own, and
// anyone else's id is "not found" so it does not even confirm the student exists.
export async function getFeesForUser(user: { id: string; role: Role }, studentId: string) {
  if (user.role === "STUDENT") {
    const own = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!own || own.id !== studentId) throw new ApiError(404, "NOT_FOUND", "Student not found");
  }
  return getFees(studentId);
}

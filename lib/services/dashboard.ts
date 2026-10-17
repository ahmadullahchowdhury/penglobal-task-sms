import { EnrolmentStatus } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { computeBalance, computeOverdue } from "@/lib/domain/balance";

// Registry dashboard numbers. All money figures are derived from the ledger.
// This loads every student's charges and payments, which is fine at this scale;
// a larger system would push the sums into SQL.
export async function getDashboard(now = new Date()) {
  const students = await prisma.student.findMany({
    select: {
      id: true,
      studentNumber: true,
      fullName: true,
      status: true,
      feeCharges: { select: { amount: true, dueDate: true } },
      payments: { select: { amount: true } },
    },
  });

  const countsByStatus = Object.fromEntries(
    Object.values(EnrolmentStatus).map((s) => [s, 0]),
  ) as Record<EnrolmentStatus, number>;

  let totalOutstanding = 0;
  const overdueStudents: {
    id: string;
    studentNumber: string;
    fullName: string;
    status: EnrolmentStatus;
    overdueAmount: number;
    daysOverdue: number;
  }[] = [];

  for (const s of students) {
    countsByStatus[s.status] += 1;
    totalOutstanding += computeBalance(s.feeCharges, s.payments);

    const { overdueAmount, daysOverdue } = computeOverdue(s.feeCharges, s.payments, now);
    if (overdueAmount > 0) {
      overdueStudents.push({
        id: s.id,
        studentNumber: s.studentNumber,
        fullName: s.fullName,
        status: s.status,
        overdueAmount,
        daysOverdue,
      });
    }
  }

  overdueStudents.sort(
    (a, b) => b.daysOverdue - a.daysOverdue || b.overdueAmount - a.overdueAmount,
  );

  return {
    totalStudents: students.length,
    totalOutstanding,
    totalOverdue: overdueStudents.reduce((t, s) => t + s.overdueAmount, 0),
    countsByStatus,
    overdueStudents,
  };
}

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { feeDueDate } from "@/lib/domain/fees";
import { canTransition, requiresReason, statusLabel } from "@/lib/domain/status";
import { formatStudentNumber } from "@/lib/domain/student-number";
import { ApiError } from "@/lib/http";
import type { ChangeStatusInput, CreateStudentInput, ListStudentsQuery } from "@/lib/validation/students";

const programmeSummary = { select: { id: true, code: true, name: true } } as const;

// One transaction: take the next number for the year, create the student, record
// the initial status and snapshot the programme fee as a charge. Any failure
// (for example a duplicate email) rolls the counter back too.
export async function createStudent(input: CreateStudentInput, actorId: string) {
  const status = input.status ?? "ENROLLED";
  const programme = await prisma.programme.findUnique({
    where: { id: input.programmeId },
  });
  if (!programme) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid request", {
      programmeId: ["Programme not found"],
    });
  }

  try {
    return await prisma.$transaction(async (tx) => {
      // Single atomic INSERT ... ON CONFLICT DO UPDATE, so concurrent callers
      // queue on the row lock and each receive a distinct sequence number.
      const counter = await tx.studentIdCounter.upsert({
        where: { year: input.academicYear },
        create: { year: input.academicYear, lastSeq: 1 },
        update: { lastSeq: { increment: 1 } },
      });

      return tx.student.create({
        data: {
          studentNumber: formatStudentNumber(input.academicYear, counter.lastSeq),
          fullName: input.fullName,
          email: input.email,
          dateOfBirth: new Date(`${input.dateOfBirth}T00:00:00.000Z`),
          programmeId: programme.id,
          academicYear: input.academicYear,
          status,
          statusHistory: {
            create: { fromStatus: null, toStatus: status, changedById: actorId },
          },
          feeCharges: {
            create: {
              amount: programme.baseFee,
              dueDate: feeDueDate(new Date(), programme.feeDueDays),
            },
          },
        },
        include: { programme: programmeSummary },
      });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(409, "EMAIL_TAKEN", "A student with this email already exists", {
        email: ["This email is already registered"],
      });
    }
    throw err;
  }
}

export async function listStudents(query: ListStudentsQuery) {
  const { q, programmeId, status, page, pageSize } = query;

  const where: Prisma.StudentWhereInput = {
    ...(programmeId && { programmeId }),
    ...(status && { status }),
    ...(q && {
      OR: [
        { fullName: { contains: q, mode: "insensitive" } },
        { studentNumber: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ],
    }),
  };

  const [total, data] = await Promise.all([
    prisma.student.count({ where }),
    prisma.student.findMany({
      where,
      include: { programme: programmeSummary },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { data, page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) };
}

// Checks the transition rules, then writes the new status, the history row and
// the audit entry in one transaction. The update is conditional on the status we
// validated against, so two admins changing the same student cannot both win.
export async function changeStudentStatus(
  studentId: string,
  input: ChangeStatusInput,
  actorId: string,
) {
  const { toStatus, reason } = input;

  return prisma.$transaction(async (tx) => {
    const student = await tx.student.findUnique({ where: { id: studentId } });
    if (!student) throw new ApiError(404, "NOT_FOUND", "Student not found");

    const from = student.status;
    if (!canTransition(from, toStatus)) {
      throw new ApiError(
        422,
        "ILLEGAL_TRANSITION",
        from === toStatus
          ? `Student is already ${statusLabel(from).toLowerCase()}`
          : `A ${statusLabel(from).toLowerCase()} student cannot be changed to ${statusLabel(toStatus).toLowerCase()}`,
      );
    }
    if (requiresReason(from, toStatus) && !reason) {
      throw new ApiError(400, "VALIDATION_ERROR", "A reason is required to re-admit a student", {
        reason: ["Enter a reason for re-admission"],
      });
    }

    const { count } = await tx.student.updateMany({
      where: { id: studentId, status: from },
      data: { status: toStatus },
    });
    if (count === 0) {
      throw new ApiError(409, "STATUS_CHANGED", "The student's status changed. Reload and try again.");
    }

    await tx.statusChange.create({
      data: { studentId, fromStatus: from, toStatus, reason, changedById: actorId },
    });
    await tx.auditLog.create({
      data: {
        actorId,
        action: "STUDENT_STATUS_CHANGED",
        entityType: "Student",
        entityId: studentId,
        metadata: { from, to: toStatus, reason: reason ?? null },
      },
    });

    return tx.student.findUniqueOrThrow({
      where: { id: studentId },
      include: { programme: programmeSummary },
    });
  });
}

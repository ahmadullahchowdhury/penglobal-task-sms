import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/db";
import { classify } from "@/lib/domain/classification";
import { planGradeUpdate } from "@/lib/domain/grade";
import { ApiError } from "@/lib/http";

// Enter or change a grade. Only for a student who has a submission. Changing the
// score of a published grade withholds it again, and every change is audited with
// the previous value.
export async function setGrade(
  assessmentId: string,
  studentId: string,
  score: number,
  actorId: string,
) {
  try {
    return await prisma.$transaction(async (tx) => {
      const submission = await tx.submission.findUnique({
        where: { studentId_assessmentId: { studentId, assessmentId } },
        select: { id: true },
      });
      if (!submission) {
        const [assessment, student] = await Promise.all([
          tx.assessment.findUnique({ where: { id: assessmentId }, select: { id: true } }),
          tx.student.findUnique({ where: { id: studentId }, select: { id: true } }),
        ]);
        if (!assessment) throw new ApiError(404, "NOT_FOUND", "Assessment not found");
        if (!student) throw new ApiError(404, "NOT_FOUND", "Student not found");
        throw new ApiError(
          422,
          "NOT_SUBMITTED",
          "This student has not submitted work for this assessment, so it cannot be graded",
        );
      }

      const existing = await tx.grade.findUnique({
        where: { studentId_assessmentId: { studentId, assessmentId } },
      });
      if (!existing) {
        return tx.grade.create({ data: { studentId, assessmentId, score, gradedById: actorId } });
      }

      // An unchanged score changes nothing, so a published grade stays published.
      const plan = planGradeUpdate(existing, score);
      if (plan.action !== "update") return existing;

      // Only change the row if it is still the one we looked at.
      const { count } = await tx.grade.updateMany({
        where: { id: existing.id, score: existing.score, isPublished: existing.isPublished },
        data: {
          score,
          gradedById: actorId,
          ...(plan.withhold && { isPublished: false, publishedAt: null, publishedById: null }),
        },
      });
      if (count === 0) {
        throw new ApiError(409, "GRADE_CHANGED", "This grade was just changed. Reload and try again.");
      }

      await tx.auditLog.create({
        data: {
          actorId,
          action: "GRADE_UPDATED",
          entityType: "Grade",
          entityId: existing.id,
          metadata: {
            assessmentId,
            studentId,
            before: { score: existing.score, isPublished: existing.isPublished },
            after: { score, isPublished: plan.withhold ? false : existing.isPublished },
          },
        },
      });

      return tx.grade.findUniqueOrThrow({ where: { id: existing.id } });
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(409, "GRADE_CHANGED", "This grade was just entered. Reload and try again.");
    }
    throw err;
  }
}

async function findGradeOrThrow(tx: Prisma.TransactionClient, assessmentId: string, studentId: string) {
  const grade = await tx.grade.findUnique({
    where: { studentId_assessmentId: { studentId, assessmentId } },
  });
  if (!grade) throw new ApiError(404, "NOT_FOUND", "No grade has been entered for this student");
  return grade;
}

// Publishing an already published grade (or withholding an unpublished one) is a no-op.
export async function publishGrade(assessmentId: string, studentId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const grade = await findGradeOrThrow(tx, assessmentId, studentId);
    if (grade.isPublished) return grade;

    const { count } = await tx.grade.updateMany({
      where: { id: grade.id, isPublished: false },
      data: { isPublished: true, publishedAt: new Date(), publishedById: actorId },
    });
    if (count === 1) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: "GRADE_PUBLISHED",
          entityType: "Grade",
          entityId: grade.id,
          metadata: { assessmentId, studentId, score: grade.score },
        },
      });
    }
    return tx.grade.findUniqueOrThrow({ where: { id: grade.id } });
  });
}

export async function withholdGrade(assessmentId: string, studentId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const grade = await findGradeOrThrow(tx, assessmentId, studentId);
    if (!grade.isPublished) return grade;

    const { count } = await tx.grade.updateMany({
      where: { id: grade.id, isPublished: true },
      data: { isPublished: false, publishedAt: null, publishedById: null },
    });
    if (count === 1) {
      await tx.auditLog.create({
        data: {
          actorId,
          action: "GRADE_WITHHELD",
          entityType: "Grade",
          entityId: grade.id,
          metadata: { assessmentId, studentId, score: grade.score },
        },
      });
    }
    return tx.grade.findUniqueOrThrow({ where: { id: grade.id } });
  });
}

// Publishes every graded, still-withheld grade for the assessment in one go.
export async function publishAllGrades(assessmentId: string, actorId: string) {
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.findUnique({
      where: { id: assessmentId },
      select: { id: true },
    });
    if (!assessment) throw new ApiError(404, "NOT_FOUND", "Assessment not found");

    const pending = await tx.grade.findMany({
      where: { assessmentId, isPublished: false },
      select: { id: true, studentId: true, score: true },
    });
    if (pending.length === 0) return { published: 0 };

    const publishedAt = new Date();
    const { count } = await tx.grade.updateMany({
      where: { id: { in: pending.map((g) => g.id) }, isPublished: false },
      data: { isPublished: true, publishedAt, publishedById: actorId },
    });

    // Audit exactly the rows this call published.
    const done = await tx.grade.findMany({
      where: { id: { in: pending.map((g) => g.id) }, publishedAt, publishedById: actorId },
      select: { id: true, studentId: true, score: true },
    });
    await tx.auditLog.createMany({
      data: done.map((g) => ({
        actorId,
        action: "GRADE_PUBLISHED",
        entityType: "Grade",
        entityId: g.id,
        metadata: { assessmentId, studentId: g.studentId, score: g.score, bulk: true },
      })),
    });

    return { published: count };
  });
}

// Staff marksheet: everyone who submitted (with their grade, if any) and the
// enrolled students in the programme who have not, who cannot be graded.
export async function getMarksheet(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { module: { select: { code: true, name: true, programmeId: true } } },
  });
  if (!assessment) throw new ApiError(404, "NOT_FOUND", "Assessment not found");

  const [submissions, grades, notSubmitted] = await Promise.all([
    prisma.submission.findMany({
      where: { assessmentId },
      include: { student: { select: { id: true, fullName: true, studentNumber: true } } },
      orderBy: { student: { fullName: "asc" } },
    }),
    prisma.grade.findMany({
      where: { assessmentId },
      select: { studentId: true, score: true, isPublished: true },
    }),
    prisma.student.findMany({
      where: {
        programmeId: assessment.module.programmeId,
        status: "ENROLLED",
        submissions: { none: { assessmentId } },
      },
      select: { id: true, fullName: true, studentNumber: true },
      orderBy: { fullName: "asc" },
    }),
  ]);

  const gradeByStudent = new Map(grades.map((g) => [g.studentId, g]));
  return {
    assessment,
    rows: submissions.map((s) => ({
      submissionId: s.id,
      student: s.student,
      isLate: s.isLate,
      originalName: s.originalName,
      grade: gradeByStudent.get(s.studentId) ?? null,
    })),
    notSubmitted,
  };
}

const publishedGradeSelect = {
  assessmentId: true,
  score: true,
  publishedAt: true,
  assessment: {
    select: { title: true, module: { select: { code: true, name: true } } },
  },
} satisfies Prisma.GradeSelect;

// Only published grades are ever selected here. Withheld ones are never read, so
// nothing about them can end up in a response.
async function getPublishedResults(studentId: string) {
  const grades = await prisma.grade.findMany({
    where: { studentId, isPublished: true },
    select: publishedGradeSelect,
    orderBy: { publishedAt: "desc" },
  });
  return grades.map((g) => ({
    assessmentId: g.assessmentId,
    title: g.assessment.title,
    module: g.assessment.module,
    score: g.score,
    classification: classify(g.score),
    publishedAt: g.publishedAt,
  }));
}

// The signed-in student's own results. If an id is given it must be their own,
// and anyone else's is "not found".
export async function getResultsForStudentUser(userId: string, requestedStudentId?: string) {
  const own = await prisma.student.findUnique({ where: { userId }, select: { id: true } });
  if (!own || (requestedStudentId !== undefined && requestedStudentId !== own.id)) {
    throw new ApiError(404, "NOT_FOUND", "Student not found");
  }
  return getPublishedResults(own.id);
}

// For the results page: published grades, plus submitted work whose grade is not
// published. The pending list carries no score and does not reveal whether the
// work has been marked.
export async function getStudentResultsView(studentId: string) {
  const [published, pendingSubmissions] = await Promise.all([
    getPublishedResults(studentId),
    prisma.submission.findMany({
      where: { studentId, assessment: { grades: { none: { studentId, isPublished: true } } } },
      select: {
        assessmentId: true,
        submittedAt: true,
        assessment: {
          select: { title: true, module: { select: { code: true, name: true } } },
        },
      },
      orderBy: { submittedAt: "desc" },
    }),
  ]);

  return {
    published,
    pending: pendingSubmissions.map((s) => ({
      assessmentId: s.assessmentId,
      title: s.assessment.title,
      module: s.assessment.module,
      submittedAt: s.submittedAt,
    })),
  };
}

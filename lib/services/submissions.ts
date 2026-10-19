import { Prisma } from "@/generated/prisma/client";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { isVisibleToStudents } from "@/lib/domain/assessment";
import { sanitizeFileName, validateUpload } from "@/lib/domain/file-validation";
import { decideSubmission } from "@/lib/domain/submission";
import { ApiError } from "@/lib/http";
import { deleteUpload, readUpload, saveUpload } from "@/lib/storage";

export type UploadedFile = { name: string; type: string; bytes: Uint8Array };

const REJECTION_STATUS = {
  NOT_ENROLLED: 403,
  NOT_OPEN: 422,
  RESUBMISSION_LOCKED: 422,
} as const;

// Applies the submission rules, stores the file and records the submission.
// A first submission is flagged late if it is after the deadline (decided now and
// never recomputed). A replacement is only allowed before the deadline, and the
// old file is deleted once the new one is safely recorded.
export async function submitWork(studentId: string, assessmentId: string, file: UploadedFile) {
  const now = new Date();

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true, status: true, programmeId: true },
  });
  if (!student) throw new ApiError(404, "NOT_FOUND", "Student not found");

  // Drafts and other programmes' work look exactly like a missing assessment.
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { module: { select: { programmeId: true } } },
  });
  if (
    !assessment ||
    !isVisibleToStudents(assessment.state) ||
    assessment.module.programmeId !== student.programmeId
  ) {
    throw new ApiError(404, "NOT_FOUND", "Assessment not found");
  }

  const existing = await prisma.submission.findUnique({
    where: { studentId_assessmentId: { studentId, assessmentId } },
  });

  const decision = decideSubmission({
    studentStatus: student.status,
    assessmentState: assessment.state,
    hasExisting: existing !== null,
    deadline: assessment.deadline,
    now,
  });
  if (!decision.ok) {
    throw new ApiError(REJECTION_STATUS[decision.code], decision.code, decision.message);
  }

  const check = validateUpload({
    name: file.name,
    mimeType: file.type,
    size: file.bytes.length,
    head: file.bytes.subarray(0, 8),
  });
  if (!check.ok) {
    throw new ApiError(
      check.code === "FILE_TOO_LARGE" ? 413 : 400,
      check.code,
      check.message,
      { file: [check.message] },
    );
  }

  const storageKey = await saveUpload(file.bytes, check.extension as ".pdf" | ".docx");
  const data = {
    storageKey,
    originalName: sanitizeFileName(file.name),
    mimeType: check.mimeType,
    sizeBytes: file.bytes.length,
    submittedAt: now,
  };

  let submission;
  try {
    submission = await prisma.$transaction(async (tx) => {
      if (decision.mode === "create" || !existing) {
        return tx.submission.create({
          data: { ...data, studentId, assessmentId, isLate: decision.isLate },
        });
      }
      // Only replace the row if it still points at the file we looked at.
      const { count } = await tx.submission.updateMany({
        where: { id: existing.id, storageKey: existing.storageKey },
        data,
      });
      if (count === 0) {
        throw new ApiError(409, "SUBMISSION_CHANGED", "Your submission changed. Reload and try again.");
      }
      return tx.submission.findUniqueOrThrow({ where: { id: existing.id } });
    });
  } catch (err) {
    // The new file was never recorded, so do not leave it behind.
    await deleteUpload(storageKey).catch(() => {});
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new ApiError(409, "ALREADY_SUBMITTED", "A submission was just made. Reload and try again.");
    }
    throw err;
  }

  if (existing) await deleteUpload(existing.storageKey).catch(() => {});
  return submission;
}

// Academic staff may download any file. A student only their own, and anyone else's is "not found".
export async function getSubmissionFile(submissionId: string, user: { id: string; role: Role }) {
  const submission = await prisma.submission.findUnique({
    where: { id: submissionId },
    include: { student: { select: { userId: true } } },
  });
  if (!submission || (user.role === "STUDENT" && submission.student.userId !== user.id)) {
    throw new ApiError(404, "NOT_FOUND", "File not found");
  }

  try {
    return {
      bytes: await readUpload(submission.storageKey),
      mimeType: submission.mimeType,
      originalName: submission.originalName,
    };
  } catch {
    throw new ApiError(404, "NOT_FOUND", "File not found");
  }
}

// What a student sees: open and closed assessments for their own programme, never
// drafts, each with their own submission if they have made one.
export async function listAssessmentsForStudent(studentId: string) {
  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { programmeId: true },
  });
  if (!student) throw new ApiError(404, "NOT_FOUND", "Student not found");

  return prisma.assessment.findMany({
    where: { state: { in: ["OPEN", "CLOSED"] }, module: { programmeId: student.programmeId } },
    include: {
      module: { select: { code: true, name: true } },
      submissions: {
        where: { studentId },
        select: { id: true, isLate: true, submittedAt: true, originalName: true, sizeBytes: true },
      },
    },
    orderBy: [{ deadline: "asc" }, { id: "asc" }],
  });
}

// Staff view of one assessment: who submitted (and when, and whether late), and
// which enrolled students in the programme have not.
export async function getAssessmentSubmissions(assessmentId: string) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: assessmentId },
    include: { module: { select: { code: true, name: true, programmeId: true } } },
  });
  if (!assessment) throw new ApiError(404, "NOT_FOUND", "Assessment not found");

  const [submissions, notSubmitted] = await Promise.all([
    prisma.submission.findMany({
      where: { assessmentId },
      include: { student: { select: { id: true, fullName: true, studentNumber: true } } },
      orderBy: { submittedAt: "asc" },
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

  return { assessment, submissions, notSubmitted };
}

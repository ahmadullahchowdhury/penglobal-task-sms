import type { AssessmentState, EnrolmentStatus } from "@/generated/prisma/enums";
import { isLateSubmission } from "@/lib/domain/late";
import { statusLabel } from "@/lib/domain/status";

export type SubmissionDecision =
  | { ok: true; mode: "create" | "replace"; isLate: boolean }
  | {
      ok: false;
      code: "NOT_ENROLLED" | "NOT_OPEN" | "RESUBMISSION_LOCKED";
      message: string;
    };

// Whether a student may submit right now, and if so whether it is a first
// submission or a replacement:
//  - only Enrolled students, and only while the assessment is Open
//  - a first submission is accepted after the deadline but flagged late
//  - a replacement is allowed only up to the deadline
export function decideSubmission(input: {
  studentStatus: EnrolmentStatus;
  assessmentState: AssessmentState;
  hasExisting: boolean;
  deadline: Date;
  now: Date;
}): SubmissionDecision {
  const { studentStatus, assessmentState, hasExisting, deadline, now } = input;

  if (studentStatus !== "ENROLLED") {
    return {
      ok: false,
      code: "NOT_ENROLLED",
      message: `Only enrolled students can submit work (your status is ${statusLabel(studentStatus).toLowerCase()})`,
    };
  }
  if (assessmentState !== "OPEN") {
    return {
      ok: false,
      code: "NOT_OPEN",
      message: "This assessment is not open for submissions",
    };
  }

  const isLate = isLateSubmission(now, deadline);
  if (hasExisting) {
    if (isLate) {
      return {
        ok: false,
        code: "RESUBMISSION_LOCKED",
        message: "The deadline has passed, so your submission can no longer be replaced",
      };
    }
    return { ok: true, mode: "replace", isLate: false };
  }
  return { ok: true, mode: "create", isLate };
}

export type SubmissionProgress = "NOT_SUBMITTED" | "SUBMITTED" | "SUBMITTED_LATE";

export function submissionProgress(
  submission: { isLate: boolean } | null | undefined,
): SubmissionProgress {
  if (!submission) return "NOT_SUBMITTED";
  return submission.isLate ? "SUBMITTED_LATE" : "SUBMITTED";
}

export const SUBMISSION_PROGRESS_LABELS: Record<SubmissionProgress, string> = {
  NOT_SUBMITTED: "Not submitted",
  SUBMITTED: "Submitted",
  SUBMITTED_LATE: "Submitted late",
};

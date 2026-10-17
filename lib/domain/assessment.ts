import type { AssessmentState } from "@/generated/prisma/enums";

// Draft -> Open -> Closed. Closed is final.
const TRANSITIONS: Record<AssessmentState, readonly AssessmentState[]> = {
  DRAFT: ["OPEN"],
  OPEN: ["CLOSED"],
  CLOSED: [],
};

const LABELS: Record<AssessmentState, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

export function assessmentStateLabel(state: AssessmentState): string {
  return LABELS[state];
}

export function allowedAssessmentTransitions(from: AssessmentState): readonly AssessmentState[] {
  return TRANSITIONS[from];
}

export function canTransitionAssessment(from: AssessmentState, to: AssessmentState): boolean {
  return TRANSITIONS[from].includes(to);
}

// Title and deadline can be changed until the assessment is closed.
export function canEditAssessment(state: AssessmentState): boolean {
  return state !== "CLOSED";
}

// Opening an assessment whose deadline has already passed would make every
// submission late from the start, so the deadline has to be moved first.
export function canOpenWithDeadline(deadline: Date, now: Date): boolean {
  return deadline.getTime() > now.getTime();
}

// Students never see drafts.
export function isVisibleToStudents(state: AssessmentState): boolean {
  return state !== "DRAFT";
}

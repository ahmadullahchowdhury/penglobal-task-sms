import type { EnrolmentStatus } from "@/generated/prisma/enums";

const TRANSITIONS: Record<EnrolmentStatus, readonly EnrolmentStatus[]> = {
  ENROLLED: ["DEFERRED", "WITHDRAWN", "COMPLETED"],
  DEFERRED: ["ENROLLED", "WITHDRAWN"],
  WITHDRAWN: ["ENROLLED"], // re-admission, the route requires a reason
  COMPLETED: [],
};

const STATUS_LABELS: Record<EnrolmentStatus, string> = {
  ENROLLED: "Enrolled",
  DEFERRED: "Deferred",
  WITHDRAWN: "Withdrawn",
  COMPLETED: "Completed",
};

export function statusLabel(status: EnrolmentStatus): string {
  return STATUS_LABELS[status];
}

// Statuses a student can move to from the given one.
export function allowedTransitions(from: EnrolmentStatus): readonly EnrolmentStatus[] {
  return TRANSITIONS[from];
}

// Re-admitting a withdrawn student must be explained.
export function requiresReason(from: EnrolmentStatus, to: EnrolmentStatus): boolean {
  return from === "WITHDRAWN" && to === "ENROLLED";
}

export function canTransition(from: EnrolmentStatus, to: EnrolmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

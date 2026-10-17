import type { EnrolmentStatus } from "@/generated/prisma/enums";

const TRANSITIONS: Record<EnrolmentStatus, readonly EnrolmentStatus[]> = {
  ENROLLED: ["DEFERRED", "WITHDRAWN", "COMPLETED"],
  DEFERRED: ["ENROLLED", "WITHDRAWN"],
  WITHDRAWN: ["ENROLLED"], // re-admission, the route requires a reason
  COMPLETED: [],
};

export function canTransition(from: EnrolmentStatus, to: EnrolmentStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

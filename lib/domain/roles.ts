import type { Role } from "@/generated/prisma/enums";

// Roles allowed into each area of the app.
export const STAFF_AREA_ROLES: readonly Role[] = ["REGISTRY_ADMIN", "STAFF"];
export const STUDENT_AREA_ROLES: readonly Role[] = ["STUDENT"];

export function homePathFor(role: Role): string {
  return STUDENT_AREA_ROLES.includes(role) ? "/student" : "/staff";
}

export const ROLE_LABELS: Record<Role, string> = {
  REGISTRY_ADMIN: "Registry Admin",
  STAFF: "Staff",
  STUDENT: "Student",
};

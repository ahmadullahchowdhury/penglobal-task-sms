import { MAX_STUDENT_AGE, MIN_STUDENT_AGE } from "@/lib/constants";

// Whole years completed on the given day. Calendar dates are compared in UTC.
export function ageOn(dateOfBirth: Date, on: Date): number {
  let age = on.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const hadBirthday =
    on.getUTCMonth() > dateOfBirth.getUTCMonth() ||
    (on.getUTCMonth() === dateOfBirth.getUTCMonth() &&
      on.getUTCDate() >= dateOfBirth.getUTCDate());
  if (!hadBirthday) age -= 1;
  return age;
}

// Must be in the past (before today) and within the allowed age range.
export function isSensibleDateOfBirth(dateOfBirth: Date, now: Date): boolean {
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  if (dateOfBirth.getTime() >= today) return false;
  const age = ageOn(dateOfBirth, now);
  return age >= MIN_STUDENT_AGE && age <= MAX_STUDENT_AGE;
}

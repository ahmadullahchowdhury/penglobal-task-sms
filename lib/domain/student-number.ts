import { STUDENT_NUMBER_PREFIX } from "@/lib/constants";

// SMS-2025-0001
export function formatStudentNumber(year: number, seq: number): string {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new RangeError(`Invalid year: ${year}`);
  }
  if (!Number.isInteger(seq) || seq < 1) {
    throw new RangeError(`Invalid sequence: ${seq}`);
  }
  return `${STUDENT_NUMBER_PREFIX}-${year}-${String(seq).padStart(4, "0")}`;
}

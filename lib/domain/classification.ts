import {
  DISTINCTION_MIN,
  MERIT_MIN,
  PASS_MIN,
  SCORE_MAX,
  SCORE_MIN,
} from "@/lib/constants";

export type Classification = "Distinction" | "Merit" | "Pass" | "Fail";

// Whole numbers 0 to 100 only.
export function isValidScore(score: number): boolean {
  return Number.isInteger(score) && score >= SCORE_MIN && score <= SCORE_MAX;
}

export function classify(score: number): Classification {
  if (!isValidScore(score)) {
    throw new RangeError(`Invalid score: ${score}`);
  }
  if (score >= DISTINCTION_MIN) return "Distinction";
  if (score >= MERIT_MIN) return "Merit";
  if (score >= PASS_MIN) return "Pass";
  return "Fail";
}

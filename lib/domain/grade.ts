import { isValidScore } from "@/lib/domain/classification";

// Turns what a person typed into a score, or null if it is not a whole number 0 to 100.
export function parseScoreInput(text: string): number | null {
  const trimmed = text.trim();
  if (!/^-?\d+(\.\d+)?$/.test(trimmed)) return null;
  const n = Number(trimmed);
  return isValidScore(n) ? n : null;
}

export type GradePlan =
  | { action: "create" }
  | { action: "noop" }
  // withhold: the grade was published and the score is changing, so it goes back
  // to withheld until staff publish it again.
  | { action: "update"; withhold: boolean };

export function planGradeUpdate(
  existing: { score: number; isPublished: boolean } | null,
  newScore: number,
): GradePlan {
  if (!existing) return { action: "create" };
  if (existing.score === newScore) return { action: "noop" };
  return { action: "update", withhold: existing.isPublished };
}

// Mean of the given scores rounded to a whole number, or null when there are none.
export function averageScore(scores: readonly number[]): number | null {
  if (scores.length === 0) return null;
  return Math.round(scores.reduce((t, s) => t + s, 0) / scores.length);
}

import { z } from "zod";
import { isValidScore } from "@/lib/domain/classification";

export const setGradeSchema = z.object({
  score: z
    .number("Score must be a number")
    .refine(isValidScore, "Score must be a whole number from 0 to 100"),
});

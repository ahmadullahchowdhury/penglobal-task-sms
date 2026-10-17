import { z } from "zod";
import { AssessmentState } from "@/generated/prisma/enums";

const title = z.string().trim().min(1, "Title is required").max(200);

// An ISO timestamp with an offset, so the server never guesses a timezone.
const futureDeadline = z.iso
  .datetime({ offset: true, error: "Enter a valid date and time" })
  .refine((s) => new Date(s).getTime() > Date.now(), "Deadline must be in the future");

export const createAssessmentSchema = z.object({
  title,
  moduleId: z.string().min(1, "Choose a module"),
  deadline: futureDeadline,
  state: z.enum(["DRAFT", "OPEN"]).default("DRAFT"),
});

export type CreateAssessmentInput = z.infer<typeof createAssessmentSchema>;

export const updateAssessmentSchema = z
  .object({
    title: title.optional(),
    deadline: futureDeadline.optional(),
    state: z.enum(AssessmentState).optional(),
  })
  .refine((v) => Object.values(v).some((x) => x !== undefined), "Nothing to change");

export type UpdateAssessmentInput = {
  title?: string;
  deadline?: string;
  state?: AssessmentState;
};

export const listAssessmentsQuerySchema = z.object({
  moduleId: z.string().min(1).optional(),
  state: z.enum(AssessmentState).optional(),
});

export type ListAssessmentsQuery = z.infer<typeof listAssessmentsQuerySchema>;

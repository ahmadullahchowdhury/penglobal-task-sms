import { z } from "zod";
import {
  ACADEMIC_YEAR_MAX,
  ACADEMIC_YEAR_MIN,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "@/lib/constants";
import { isSensibleDateOfBirth } from "@/lib/domain/age";
import { EnrolmentStatus } from "@/generated/prisma/enums";
export const createStudentSchema = z.object({
  fullName: z.string().trim().min(1, "Full name is required").max(200),
  email: z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address")),
  dateOfBirth: z.iso
    .date("Use the format YYYY-MM-DD")
    .refine(
      (s) => isSensibleDateOfBirth(new Date(`${s}T00:00:00.000Z`), new Date()),
      "Date of birth must be in the past and give an age between 16 and 100",
    ),
  programmeId: z.string().min(1, "Choose a programme"),
  academicYear: z
    .number("Academic year must be a number")
    .int()
    .min(ACADEMIC_YEAR_MIN)
    .max(ACADEMIC_YEAR_MAX),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;

export const listStudentsQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
  programmeId: z.string().min(1).optional(),
  status: z.enum(EnrolmentStatus).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
});

export type ListStudentsQuery = z.infer<typeof listStudentsQuerySchema>;

export const changeStatusSchema = z.object({
  toStatus: z.enum(EnrolmentStatus),
  reason: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => s || undefined),
});

export type ChangeStatusInput = { toStatus: EnrolmentStatus; reason?: string };

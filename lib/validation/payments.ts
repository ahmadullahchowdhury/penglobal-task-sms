import { z } from "zod";

export const recordPaymentSchema = z.object({
  amount: z
    .number("Amount must be a number")
    .int("Amount must be a whole number of pence")
    .positive("Amount must be greater than zero"),
  reference: z.string().trim().min(1, "Reference is required").max(100),
  note: z
    .string()
    .trim()
    .max(500)
    .optional()
    .transform((s) => s || undefined),
});

export type RecordPaymentInput = {
  amount: number;
  reference: string;
  note?: string;
};

export const reversePaymentSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required").max(500),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

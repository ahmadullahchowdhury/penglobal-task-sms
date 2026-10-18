import { z } from "zod";
import { isAcceptablePaymentDate } from "@/lib/domain/payment-date";

export const recordPaymentSchema = z.object({
  amount: z
    .number("Amount must be a number")
    .int("Amount must be a whole number of pence")
    .positive("Amount must be greater than zero"),
  reference: z.string().trim().min(1, "Reference is required").max(100),
  // The day the money was received (YYYY-MM-DD). Left out means now.
  paidOn: z.iso
    .date("Use the format YYYY-MM-DD")
    .refine((d) => isAcceptablePaymentDate(d, new Date()), "Date received cannot be in the future")
    .optional(),
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
  paidOn?: string;
  note?: string;
};

export const reversePaymentSchema = z.object({
  reason: z.string().trim().min(1, "A reason is required").max(500),
});

export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

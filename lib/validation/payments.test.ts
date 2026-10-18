import { describe, expect, it } from "vitest";
import { recordPaymentSchema, reversePaymentSchema } from "./payments";

const valid = { amount: 25000, reference: "BANK-1" };

describe("recordPaymentSchema", () => {
  it("accepts a positive whole number of pence", () => {
    expect(recordPaymentSchema.safeParse(valid).success).toBe(true);
    expect(recordPaymentSchema.safeParse({ ...valid, amount: 1 }).success).toBe(true);
  });

  it.each([0, -1, -25000])("rejects %i", (amount) => {
    const r = recordPaymentSchema.safeParse({ ...valid, amount });
    expect(r.success).toBe(false);
  });

  it("rejects fractional pence and non-numbers", () => {
    expect(recordPaymentSchema.safeParse({ ...valid, amount: 10.5 }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...valid, amount: "100" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...valid, amount: NaN }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ reference: "x" }).success).toBe(false);
  });

  it("rejects a blank or whitespace-only reference and trims the rest", () => {
    expect(recordPaymentSchema.safeParse({ ...valid, reference: "" }).success).toBe(false);
    expect(recordPaymentSchema.safeParse({ ...valid, reference: "   " }).success).toBe(false);
    const r = recordPaymentSchema.safeParse({ ...valid, reference: "  REF-9  " });
    expect(r.success && r.data.reference).toBe("REF-9");
  });

  it("turns a blank note into no note", () => {
    const r = recordPaymentSchema.safeParse({ ...valid, note: "   " });
    expect(r.success && r.data.note).toBeUndefined();
  });
});

describe("reversePaymentSchema", () => {
  it("needs a non-blank reason", () => {
    expect(reversePaymentSchema.safeParse({ reason: "Bounced" }).success).toBe(true);
    expect(reversePaymentSchema.safeParse({ reason: "  " }).success).toBe(false);
    expect(reversePaymentSchema.safeParse({}).success).toBe(false);
  });
});

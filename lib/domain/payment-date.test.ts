import { describe, expect, it } from "vitest";
import { isAcceptablePaymentDate, paymentDateFor } from "./payment-date";

const now = new Date("2026-06-15T10:30:00.000Z");

describe("isAcceptablePaymentDate", () => {
  it("accepts today and earlier days", () => {
    expect(isAcceptablePaymentDate("2026-06-15", now)).toBe(true);
    expect(isAcceptablePaymentDate("2026-06-10", now)).toBe(true);
    expect(isAcceptablePaymentDate("2025-01-01", now)).toBe(true);
  });

  it("allows one day ahead for people whose today is already tomorrow in UTC", () => {
    expect(isAcceptablePaymentDate("2026-06-16", now)).toBe(true);
  });

  it("rejects the future beyond that", () => {
    expect(isAcceptablePaymentDate("2026-06-17", now)).toBe(false);
    expect(isAcceptablePaymentDate("2099-01-01", now)).toBe(false);
  });

  it("rejects nonsense and absurdly old dates", () => {
    for (const bad of ["", "yesterday", "2026-13-40", "15/06/2026", "1999-12-31"]) {
      expect(isAcceptablePaymentDate(bad, now), bad).toBe(false);
    }
  });
});

describe("paymentDateFor", () => {
  it("is right now when no date is given", () => {
    expect(paymentDateFor(undefined, now)).toBe(now);
  });

  it("is right now for today, and for a day ahead in UTC", () => {
    expect(paymentDateFor("2026-06-15", now)).toBe(now);
    expect(paymentDateFor("2026-06-16", now)).toBe(now);
  });

  it("is midday UTC on an earlier day", () => {
    expect(paymentDateFor("2026-06-10", now).toISOString()).toBe("2026-06-10T12:00:00.000Z");
  });
});

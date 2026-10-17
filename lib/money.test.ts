import { describe, expect, it } from "vitest";
import { formatMoney } from "./money";

describe("formatMoney", () => {
  it("formats minor units as GBP", () => {
    expect(formatMoney(0)).toBe("£0.00");
    expect(formatMoney(5)).toBe("£0.05");
    expect(formatMoney(123456)).toBe("£1,234.56");
  });
  it("formats negatives (reversals)", () => {
    expect(formatMoney(-2500)).toBe("-£25.00");
  });
  it("rejects non-integers", () => {
    expect(() => formatMoney(10.5)).toThrow(RangeError);
  });
});

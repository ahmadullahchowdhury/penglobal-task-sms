import { describe, expect, it } from "vitest";
import { formatStudentNumber } from "./student-number";

describe("formatStudentNumber", () => {
  it("pads the sequence to four digits", () => {
    expect(formatStudentNumber(2025, 1)).toBe("SMS-2025-0001");
    expect(formatStudentNumber(2025, 42)).toBe("SMS-2025-0042");
    expect(formatStudentNumber(2026, 9999)).toBe("SMS-2026-9999");
  });
  it("does not truncate beyond four digits", () => {
    expect(formatStudentNumber(2025, 10000)).toBe("SMS-2025-10000");
  });
  it("rejects invalid input", () => {
    expect(() => formatStudentNumber(2025, 0)).toThrow(RangeError);
    expect(() => formatStudentNumber(2025, 1.5)).toThrow(RangeError);
    expect(() => formatStudentNumber(25, 1)).toThrow(RangeError);
  });
});

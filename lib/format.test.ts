import { describe, expect, it } from "vitest";
import { academicYearLabel } from "./format";

describe("academicYearLabel", () => {
  it("shows the start year and the short end year", () => {
    expect(academicYearLabel(2025)).toBe("2025/26");
    expect(academicYearLabel(2009)).toBe("2009/10");
    expect(academicYearLabel(2099)).toBe("2099/00");
  });
});

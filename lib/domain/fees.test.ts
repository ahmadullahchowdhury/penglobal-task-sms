import { describe, expect, it } from "vitest";
import { feeDueDate } from "./fees";

describe("feeDueDate", () => {
  it("adds the due days", () => {
    expect(feeDueDate(new Date("2026-01-01T09:00:00.000Z"), 30).toISOString()).toBe(
      "2026-01-31T09:00:00.000Z",
    );
  });
  it("crosses month and year ends", () => {
    expect(feeDueDate(new Date("2026-12-20T00:00:00.000Z"), 30).toISOString()).toBe(
      "2027-01-19T00:00:00.000Z",
    );
  });
  it("zero days is the same moment", () => {
    const from = new Date("2026-05-05T05:05:05.000Z");
    expect(feeDueDate(from, 0).getTime()).toBe(from.getTime());
  });
});

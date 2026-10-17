import { describe, expect, it } from "vitest";
import { isLateSubmission } from "./late";

const deadline = new Date("2026-03-01T12:00:00.000Z");

describe("isLateSubmission", () => {
  it("is on time before the deadline", () => {
    expect(isLateSubmission(new Date("2026-03-01T11:59:59.999Z"), deadline)).toBe(false);
  });
  it("is on time exactly at the deadline", () => {
    expect(isLateSubmission(new Date(deadline), deadline)).toBe(false);
  });
  it("is late one millisecond after", () => {
    expect(isLateSubmission(new Date("2026-03-01T12:00:00.001Z"), deadline)).toBe(true);
  });
  it("compares instants regardless of timezone offset", () => {
    expect(isLateSubmission(new Date("2026-03-01T13:00:00+01:00"), deadline)).toBe(false);
    expect(isLateSubmission(new Date("2026-03-01T13:00:01+01:00"), deadline)).toBe(true);
  });
});

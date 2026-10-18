import { describe, expect, it } from "vitest";
import { academicYearLabel, describeDeadline, formatDuration, formatFileSize } from "./format";

describe("academicYearLabel", () => {
  it("shows the start year and the short end year", () => {
    expect(academicYearLabel(2025)).toBe("2025/26");
    expect(academicYearLabel(2009)).toBe("2009/10");
    expect(academicYearLabel(2099)).toBe("2099/00");
  });
});


describe("formatDuration", () => {
  it("shows the two largest units", () => {
    expect(formatDuration((2 * 24 + 3) * 3_600_000 + 5 * 60_000)).toBe("2 days 3 hours");
    expect(formatDuration(3_600_000 + 60_000)).toBe("1 hour 1 minute");
    expect(formatDuration(45 * 60_000)).toBe("45 minutes");
  });
  it("skips zero units", () => {
    expect(formatDuration(24 * 3_600_000 + 5 * 60_000)).toBe("1 day 5 minutes");
  });
  it("handles very short and negative spans", () => {
    expect(formatDuration(30_000)).toBe("less than a minute");
    expect(formatDuration(-5)).toBe("less than a minute");
  });
});

describe("describeDeadline", () => {
  const deadline = new Date("2026-06-10T12:00:00.000Z");
  it("counts down before the deadline", () => {
    expect(describeDeadline(deadline, new Date("2026-06-08T09:00:00.000Z"))).toEqual({
      overdue: false,
      text: "Due in 2 days 3 hours",
    });
  });
  it("is overdue after it", () => {
    expect(describeDeadline(deadline, new Date("2026-06-10T17:00:00.000Z"))).toEqual({
      overdue: true,
      text: "Deadline passed 5 hours ago",
    });
  });
});

describe("formatFileSize", () => {
  it("picks a readable unit", () => {
    expect(formatFileSize(512)).toBe("512 B");
    expect(formatFileSize(1536)).toBe("1.5 KB");
    expect(formatFileSize(200 * 1024)).toBe("200 KB");
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
  });
});

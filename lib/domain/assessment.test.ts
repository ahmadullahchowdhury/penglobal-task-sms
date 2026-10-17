import { describe, expect, it } from "vitest";
import type { AssessmentState } from "@/generated/prisma/enums";
import {
  canEditAssessment,
  canOpenWithDeadline,
  canTransitionAssessment,
  isVisibleToStudents,
} from "./assessment";

describe("canTransitionAssessment", () => {
  it.each<[AssessmentState, AssessmentState]>([
    ["DRAFT", "OPEN"],
    ["OPEN", "CLOSED"],
  ])("allows %s -> %s", (from, to) => {
    expect(canTransitionAssessment(from, to)).toBe(true);
  });

  it.each<[AssessmentState, AssessmentState]>([
    ["DRAFT", "CLOSED"],
    ["DRAFT", "DRAFT"],
    ["OPEN", "DRAFT"],
    ["OPEN", "OPEN"],
    ["CLOSED", "OPEN"],
    ["CLOSED", "DRAFT"],
    ["CLOSED", "CLOSED"],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransitionAssessment(from, to)).toBe(false);
  });
});

describe("canEditAssessment", () => {
  it("is false only once closed", () => {
    expect(canEditAssessment("DRAFT")).toBe(true);
    expect(canEditAssessment("OPEN")).toBe(true);
    expect(canEditAssessment("CLOSED")).toBe(false);
  });
});

describe("canOpenWithDeadline", () => {
  const now = new Date("2026-06-01T12:00:00.000Z");
  it("needs the deadline to be in the future", () => {
    expect(canOpenWithDeadline(new Date("2026-06-01T12:00:00.001Z"), now)).toBe(true);
    expect(canOpenWithDeadline(new Date("2026-06-01T12:00:00.000Z"), now)).toBe(false);
    expect(canOpenWithDeadline(new Date("2026-05-31T12:00:00.000Z"), now)).toBe(false);
  });
});

describe("isVisibleToStudents", () => {
  it("hides drafts only", () => {
    expect(isVisibleToStudents("DRAFT")).toBe(false);
    expect(isVisibleToStudents("OPEN")).toBe(true);
    expect(isVisibleToStudents("CLOSED")).toBe(true);
  });
});

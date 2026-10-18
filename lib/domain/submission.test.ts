import { describe, expect, it } from "vitest";
import type { AssessmentState, EnrolmentStatus } from "@/generated/prisma/enums";
import { decideSubmission, submissionProgress } from "./submission";

const deadline = new Date("2026-06-10T12:00:00.000Z");
const before = new Date("2026-06-10T11:59:59.999Z");
const at = new Date(deadline);
const after = new Date("2026-06-10T12:00:00.001Z");

const decide = (
  over: Partial<{
    studentStatus: EnrolmentStatus;
    assessmentState: AssessmentState;
    hasExisting: boolean;
    now: Date;
  }> = {},
) =>
  decideSubmission({
    studentStatus: "ENROLLED",
    assessmentState: "OPEN",
    hasExisting: false,
    deadline,
    now: before,
    ...over,
  });

describe("decideSubmission", () => {
  it("creates an on-time first submission", () => {
    expect(decide()).toEqual({ ok: true, mode: "create", isLate: false });
  });

  it("treats a first submission exactly at the deadline as on time", () => {
    expect(decide({ now: at })).toEqual({ ok: true, mode: "create", isLate: false });
  });

  it("accepts a first submission after the deadline and flags it late", () => {
    expect(decide({ now: after })).toEqual({ ok: true, mode: "create", isLate: true });
  });

  it("replaces an existing submission before the deadline", () => {
    expect(decide({ hasExisting: true })).toEqual({ ok: true, mode: "replace", isLate: false });
    expect(decide({ hasExisting: true, now: at })).toMatchObject({ ok: true, mode: "replace" });
  });

  it("blocks replacing once the deadline has passed", () => {
    expect(decide({ hasExisting: true, now: after })).toMatchObject({
      ok: false,
      code: "RESUBMISSION_LOCKED",
    });
  });

  it.each<EnrolmentStatus>(["DEFERRED", "WITHDRAWN", "COMPLETED"])(
    "rejects a %s student",
    (studentStatus) => {
      expect(decide({ studentStatus })).toMatchObject({ ok: false, code: "NOT_ENROLLED" });
    },
  );

  it.each<AssessmentState>(["DRAFT", "CLOSED"])("rejects a %s assessment", (assessmentState) => {
    expect(decide({ assessmentState })).toMatchObject({ ok: false, code: "NOT_OPEN" });
  });

  it("checks enrolment before the assessment state", () => {
    expect(decide({ studentStatus: "WITHDRAWN", assessmentState: "CLOSED" })).toMatchObject({
      code: "NOT_ENROLLED",
    });
  });
});

describe("submissionProgress", () => {
  it("maps a submission to its state", () => {
    expect(submissionProgress(null)).toBe("NOT_SUBMITTED");
    expect(submissionProgress({ isLate: false })).toBe("SUBMITTED");
    expect(submissionProgress({ isLate: true })).toBe("SUBMITTED_LATE");
  });
});

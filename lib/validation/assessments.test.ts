import { describe, expect, it } from "vitest";
import { createAssessmentSchema, updateAssessmentSchema } from "./assessments";

const hours = (n: number) => new Date(Date.now() + n * 3600_000).toISOString();
const valid = { title: "Essay 1", moduleId: "m1", deadline: hours(48) };

describe("createAssessmentSchema", () => {
  it("accepts a future deadline and defaults to Draft", () => {
    const r = createAssessmentSchema.safeParse(valid);
    expect(r.success && r.data.state).toBe("DRAFT");
  });

  it("rejects a deadline in the past", () => {
    const r = createAssessmentSchema.safeParse({ ...valid, deadline: hours(-1) });
    expect(r.success).toBe(false);
  });

  it("rejects a timestamp without an offset or a non-date", () => {
    expect(createAssessmentSchema.safeParse({ ...valid, deadline: "2099-01-01T10:00:00" }).success).toBe(false);
    expect(createAssessmentSchema.safeParse({ ...valid, deadline: "tomorrow" }).success).toBe(false);
  });

  it("rejects a blank title and creating a Closed assessment", () => {
    expect(createAssessmentSchema.safeParse({ ...valid, title: "  " }).success).toBe(false);
    expect(createAssessmentSchema.safeParse({ ...valid, state: "CLOSED" }).success).toBe(false);
  });
});

describe("updateAssessmentSchema", () => {
  it("needs at least one field", () => {
    expect(updateAssessmentSchema.safeParse({}).success).toBe(false);
    expect(updateAssessmentSchema.safeParse({ state: "OPEN" }).success).toBe(true);
  });
  it("rejects a past deadline", () => {
    expect(updateAssessmentSchema.safeParse({ deadline: hours(-5) }).success).toBe(false);
  });
});

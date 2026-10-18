import { describe, expect, it } from "vitest";
import { setGradeSchema } from "./grades";

describe("setGradeSchema", () => {
  it.each([0, 39, 40, 59, 60, 69, 70, 100])("accepts %i", (score) => {
    expect(setGradeSchema.safeParse({ score }).success).toBe(true);
  });

  it.each([-1, 101, 55.5, NaN, Infinity])("rejects %s", (score) => {
    expect(setGradeSchema.safeParse({ score }).success).toBe(false);
  });

  it("rejects a string or a missing score", () => {
    expect(setGradeSchema.safeParse({ score: "70" }).success).toBe(false);
    expect(setGradeSchema.safeParse({}).success).toBe(false);
  });
});

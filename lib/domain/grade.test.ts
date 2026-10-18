import { describe, expect, it } from "vitest";
import { parseScoreInput, planGradeUpdate } from "./grade";

describe("parseScoreInput", () => {
  it.each([
    ["0", 0],
    ["39", 39],
    ["40", 40],
    ["59", 59],
    ["60", 60],
    ["69", 69],
    ["70", 70],
    ["100", 100],
    [" 72 ", 72],
    ["55.0", 55],
  ])("accepts %j", (text, score) => {
    expect(parseScoreInput(text)).toBe(score);
  });

  it.each(["-1", "101", "55.5", "", "abc", "1e2", "5 5", "NaN"])("rejects %j", (text) => {
    expect(parseScoreInput(text)).toBeNull();
  });
});

describe("planGradeUpdate", () => {
  it("creates a grade when there is none", () => {
    expect(planGradeUpdate(null, 65)).toEqual({ action: "create" });
  });

  it("does nothing when the score is unchanged, even if published", () => {
    expect(planGradeUpdate({ score: 65, isPublished: false }, 65)).toEqual({ action: "noop" });
    expect(planGradeUpdate({ score: 65, isPublished: true }, 65)).toEqual({ action: "noop" });
  });

  it("updates an unpublished grade without touching publication", () => {
    expect(planGradeUpdate({ score: 65, isPublished: false }, 70)).toEqual({
      action: "update",
      withhold: false,
    });
  });

  it("withholds a published grade when its score changes", () => {
    expect(planGradeUpdate({ score: 65, isPublished: true }, 40)).toEqual({
      action: "update",
      withhold: true,
    });
  });
});

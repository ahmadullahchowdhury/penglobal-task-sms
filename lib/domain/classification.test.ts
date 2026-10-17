import { describe, expect, it } from "vitest";
import { classify, isValidScore } from "./classification";

describe("isValidScore", () => {
  it.each([0, 1, 39, 40, 55, 100])("accepts %i", (s) => {
    expect(isValidScore(s)).toBe(true);
  });
  it.each([-1, 101, 55.5, NaN, Infinity])("rejects %s", (s) => {
    expect(isValidScore(s)).toBe(false);
  });
});

describe("classify", () => {
  it.each([
    [0, "Fail"],
    [39, "Fail"],
    [40, "Pass"],
    [55, "Pass"],
    [59, "Pass"],
    [60, "Merit"],
    [69, "Merit"],
    [70, "Distinction"],
    [100, "Distinction"],
  ])("%i -> %s", (score, label) => {
    expect(classify(score)).toBe(label);
  });

  it.each([-1, 101, 55.5])("throws for %s", (s) => {
    expect(() => classify(s)).toThrow(RangeError);
  });
});

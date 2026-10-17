import { describe, expect, it } from "vitest";
import { ageOn, isSensibleDateOfBirth } from "./age";

const now = new Date("2026-06-15T10:00:00.000Z");
const d = (s: string) => new Date(`${s}T00:00:00.000Z`);

describe("ageOn", () => {
  it("counts the birthday on the day itself", () => {
    expect(ageOn(d("2000-06-15"), now)).toBe(26);
  });
  it("has not had the birthday the day before", () => {
    expect(ageOn(d("2000-06-16"), now)).toBe(25);
  });
});

describe("isSensibleDateOfBirth", () => {
  it("accepts a typical student", () => {
    expect(isSensibleDateOfBirth(d("2004-03-02"), now)).toBe(true);
  });
  it("rejects today and the future", () => {
    expect(isSensibleDateOfBirth(d("2026-06-15"), now)).toBe(false);
    expect(isSensibleDateOfBirth(d("2027-01-01"), now)).toBe(false);
  });
  it("enforces the minimum age of 16", () => {
    expect(isSensibleDateOfBirth(d("2010-06-15"), now)).toBe(true);
    expect(isSensibleDateOfBirth(d("2010-06-16"), now)).toBe(false);
  });
  it("enforces the maximum age of 100", () => {
    expect(isSensibleDateOfBirth(d("1926-06-15"), now)).toBe(true);
    expect(isSensibleDateOfBirth(d("1925-06-15"), now)).toBe(false);
  });
});

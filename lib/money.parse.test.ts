import { describe, expect, it } from "vitest";
import { parseMoneyToMinor } from "./money";

describe("parseMoneyToMinor", () => {
  it.each([
    ["0", 0],
    ["99", 9900],
    ["20.5", 2050],
    ["20.05", 2005],
    ["1,250.50", 125050],
    ["£20", 2000],
    ["  7.00 ", 700],
  ])("parses %s", (input, minor) => {
    expect(parseMoneyToMinor(input)).toBe(minor);
  });

  it.each(["", "abc", "-5", "1.234", "1.2.3", "£", ".5", "1e3"])("rejects %j", (input) => {
    expect(parseMoneyToMinor(input)).toBeNull();
  });
});

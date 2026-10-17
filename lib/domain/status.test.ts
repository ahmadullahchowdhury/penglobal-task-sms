import { describe, expect, it } from "vitest";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { canTransition } from "./status";

describe("canTransition", () => {
  it.each<[EnrolmentStatus, EnrolmentStatus]>([
    ["ENROLLED", "DEFERRED"],
    ["ENROLLED", "WITHDRAWN"],
    ["ENROLLED", "COMPLETED"],
    ["DEFERRED", "ENROLLED"],
    ["DEFERRED", "WITHDRAWN"],
    ["WITHDRAWN", "ENROLLED"],
  ])("allows %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(true);
  });

  it.each<[EnrolmentStatus, EnrolmentStatus]>([
    ["ENROLLED", "ENROLLED"],
    ["DEFERRED", "COMPLETED"],
    ["DEFERRED", "DEFERRED"],
    ["WITHDRAWN", "DEFERRED"],
    ["WITHDRAWN", "COMPLETED"],
    ["COMPLETED", "ENROLLED"],
    ["COMPLETED", "DEFERRED"],
    ["COMPLETED", "WITHDRAWN"],
  ])("rejects %s -> %s", (from, to) => {
    expect(canTransition(from, to)).toBe(false);
  });
});

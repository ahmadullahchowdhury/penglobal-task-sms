import { describe, expect, it } from "vitest";
import { homePathFor } from "./roles";

describe("homePathFor", () => {
  it("sends admin and staff to /staff", () => {
    expect(homePathFor("REGISTRY_ADMIN")).toBe("/staff");
    expect(homePathFor("STAFF")).toBe("/staff");
  });
  it("sends students to /student", () => {
    expect(homePathFor("STUDENT")).toBe("/student");
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ unstable_rethrow: vi.fn() }));

import { ApiError, errorResponse } from "./http";

afterEach(() => vi.restoreAllMocks());

describe("errorResponse", () => {
  it("uses the { error: { code, message, fields } } shape and the given status", async () => {
    const res = errorResponse(
      new ApiError(409, "EMAIL_TAKEN", "Already registered", { email: ["Taken"] }),
    );
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: { code: "EMAIL_TAKEN", message: "Already registered", fields: { email: ["Taken"] } },
    });
  });

  it("omits fields when there are none", async () => {
    const body = await errorResponse(new ApiError(404, "NOT_FOUND", "Gone")).json();
    expect(body).toEqual({ error: { code: "NOT_FOUND", message: "Gone" } });
  });

  it("turns an unexpected error into a generic 500 without leaking its message", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const res = errorResponse(new Error("connection string postgres://user:secret@host"));
    expect(res.status).toBe(500);
    const text = JSON.stringify(await res.json());
    expect(text).toContain("INTERNAL");
    expect(text).not.toContain("secret");
  });
});

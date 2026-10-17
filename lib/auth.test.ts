import { beforeEach, describe, expect, it, vi } from "vitest";

const { cookieGet, findUnique } = vi.hoisted(() => ({
  cookieGet: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("next/headers", () => ({
  cookies: async () => ({ get: cookieGet }),
}));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), unstable_rethrow: vi.fn() }));
vi.mock("@/lib/db", () => ({ prisma: { user: { findUnique } } }));

import { requireRole } from "./auth";
import { ApiError, errorResponse } from "./http";

function signedInAs(role: string) {
  cookieGet.mockReturnValue({ value: "u1" });
  findUnique.mockResolvedValue({ id: "u1", role });
}

// Same shape as app/api/staff/ping/route.ts
async function ping() {
  try {
    await requireRole("REGISTRY_ADMIN", "STAFF");
    return new Response(null, { status: 200 });
  } catch (err) {
    return errorResponse(err);
  }
}

beforeEach(() => {
  cookieGet.mockReset();
  findUnique.mockReset();
});

describe("requireRole", () => {
  it("returns 403 FORBIDDEN for a student cookie on a staff route", async () => {
    signedInAs("STUDENT");
    const res = await ping();
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("allows staff and admin", async () => {
    for (const role of ["STAFF", "REGISTRY_ADMIN"]) {
      signedInAs(role);
      expect((await ping()).status).toBe(200);
    }
  });

  it("returns 401 with no cookie", async () => {
    cookieGet.mockReturnValue(undefined);
    expect((await ping()).status).toBe(401);
  });

  it("rejects a cookie that points at a missing user", async () => {
    cookieGet.mockReturnValue({ value: "ghost" });
    findUnique.mockResolvedValue(null);
    await expect(requireRole("STAFF")).rejects.toBeInstanceOf(ApiError);
  });
});

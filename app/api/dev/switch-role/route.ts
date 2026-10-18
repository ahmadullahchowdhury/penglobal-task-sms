import { cookies } from "next/headers";
import { z } from "zod";
import { SESSION_COOKIE } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";

const bodySchema = z.object({ userId: z.string().min(1) });

export async function POST(request: Request) {
  try {
    if (process.env.DEMO_ROLE_SWITCHER !== "true") {
      throw new ApiError(404, "NOT_FOUND", "Not found");
    }

    const { userId } = parseInput(bodySchema, await readJson(request));
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new ApiError(404, "NOT_FOUND", "User not found");

    (await cookies()).set(SESSION_COOKIE, user.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
    });

    return Response.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (err) {
    return errorResponse(err);
  }
}

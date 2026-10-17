import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/http";
import { getFees } from "@/lib/services/fees";

export async function GET(_request: Request, ctx: RouteContext<"/api/students/[id]/fees">) {
  try {
    const user = await requireRole("REGISTRY_ADMIN", "STUDENT");
    const { id } = await ctx.params;

    if (user.role === "STUDENT") {
      // A student only ever sees their own record. Anyone else's id is "not found".
      const own = await prisma.student.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!own || own.id !== id) throw new ApiError(404, "NOT_FOUND", "Student not found");
    }

    return Response.json(await getFees(id));
  } catch (err) {
    return errorResponse(err);
  }
}

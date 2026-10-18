import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { publishGrade } from "@/lib/services/grades";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/assessments/[id]/grades/[studentId]/publish">,
) {
  try {
    const user = await requireRole("STAFF");
    const { id, studentId } = await ctx.params;
    return Response.json({ grade: await publishGrade(id, studentId, user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

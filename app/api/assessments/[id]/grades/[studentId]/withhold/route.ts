import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { withholdGrade } from "@/lib/services/grades";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/assessments/[id]/grades/[studentId]/withhold">,
) {
  try {
    const user = await requireRole("STAFF");
    const { id, studentId } = await ctx.params;
    return Response.json({ grade: await withholdGrade(id, studentId, user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

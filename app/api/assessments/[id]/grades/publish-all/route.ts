import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { publishAllGrades } from "@/lib/services/grades";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/assessments/[id]/grades/publish-all">,
) {
  try {
    const user = await requireRole("STAFF");
    const { id } = await ctx.params;
    return Response.json(await publishAllGrades(id, user.id));
  } catch (err) {
    return errorResponse(err);
  }
}

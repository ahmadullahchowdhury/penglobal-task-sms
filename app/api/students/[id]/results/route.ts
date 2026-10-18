import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { getResultsForStudentUser } from "@/lib/services/grades";

// A student can only ask for their own results. Any other id is "not found".
export async function GET(_request: Request, ctx: RouteContext<"/api/students/[id]/results">) {
  try {
    const user = await requireRole("STUDENT");
    const { id } = await ctx.params;
    return Response.json({ results: await getResultsForStudentUser(user.id, id) });
  } catch (err) {
    return errorResponse(err);
  }
}

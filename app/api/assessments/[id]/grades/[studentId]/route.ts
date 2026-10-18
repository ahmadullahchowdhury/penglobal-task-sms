import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { setGrade } from "@/lib/services/grades";
import { setGradeSchema } from "@/lib/validation/grades";

export async function PUT(
  request: Request,
  ctx: RouteContext<"/api/assessments/[id]/grades/[studentId]">,
) {
  try {
    const user = await requireRole("STAFF");
    const { id, studentId } = await ctx.params;
    const { score } = parseInput(setGradeSchema, await readJson(request));
    return Response.json({ grade: await setGrade(id, studentId, score, user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { updateAssessment } from "@/lib/services/assessments";
import { updateAssessmentSchema } from "@/lib/validation/assessments";

export async function PATCH(request: Request, ctx: RouteContext<"/api/assessments/[id]">) {
  try {
    await requireRole("STAFF");
    const { id } = await ctx.params;
    const input = parseInput(updateAssessmentSchema, await readJson(request));
    return Response.json({ assessment: await updateAssessment(id, input) });
  } catch (err) {
    return errorResponse(err);
  }
}

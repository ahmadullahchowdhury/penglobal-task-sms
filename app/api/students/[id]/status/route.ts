import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { changeStudentStatus } from "@/lib/services/students";
import { changeStatusSchema } from "@/lib/validation/students";

export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/students/[id]/status">,
) {
  try {
    const user = await requireRole("REGISTRY_ADMIN");
    const { id } = await ctx.params;
    const input = parseInput(changeStatusSchema, await readJson(request));
    const student = await changeStudentStatus(id, input, user.id);
    return Response.json({ student });
  } catch (err) {
    return errorResponse(err);
  }
}

import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { getFeesForUser } from "@/lib/services/fees";

export async function GET(_request: Request, ctx: RouteContext<"/api/students/[id]/fees">) {
  try {
    const user = await requireRole("REGISTRY_ADMIN", "STUDENT");
    const { id } = await ctx.params;
    return Response.json(await getFeesForUser(user, id));
  } catch (err) {
    return errorResponse(err);
  }
}

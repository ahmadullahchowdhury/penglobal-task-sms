import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";

export async function GET() {
  try {
    const user = await requireRole("REGISTRY_ADMIN", "STAFF");
    return Response.json({ ok: true, role: user.role });
  } catch (err) {
    return errorResponse(err);
  }
}

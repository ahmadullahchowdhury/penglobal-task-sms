import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { getResultsForStudentUser } from "@/lib/services/grades";

// Published grades only. Withheld grades are never queried, so nothing about
// them can appear here.
export async function GET() {
  try {
    const user = await requireRole("STUDENT");
    return Response.json({ results: await getResultsForStudentUser(user.id) });
  } catch (err) {
    return errorResponse(err);
  }
}

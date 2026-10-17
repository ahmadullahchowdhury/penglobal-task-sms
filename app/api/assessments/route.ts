import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { createAssessment, listAssessments } from "@/lib/services/assessments";
import { createAssessmentSchema, listAssessmentsQuerySchema } from "@/lib/validation/assessments";

export async function POST(request: Request) {
  try {
    const user = await requireRole("REGISTRY_ADMIN", "STAFF");
    const input = parseInput(createAssessmentSchema, await readJson(request));
    const assessment = await createAssessment(input, user.id);
    return Response.json({ assessment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole("REGISTRY_ADMIN", "STAFF");
    const params = Object.fromEntries(
      [...new URL(request.url).searchParams].filter(([, v]) => v !== ""),
    );
    const query = parseInput(listAssessmentsQuerySchema, params);
    return Response.json({ assessments: await listAssessments(query) });
  } catch (err) {
    return errorResponse(err);
  }
}

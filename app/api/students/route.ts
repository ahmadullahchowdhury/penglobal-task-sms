import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { createStudent, listStudents } from "@/lib/services/students";
import { createStudentSchema, listStudentsQuerySchema } from "@/lib/validation/students";

export async function POST(request: Request) {
  try {
    const user = await requireRole("REGISTRY_ADMIN");
    const input = parseInput(createStudentSchema, await readJson(request));
    const student = await createStudent(input, user.id);
    return Response.json({ student }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function GET(request: Request) {
  try {
    await requireRole("REGISTRY_ADMIN");
    // Blank filters from a form behave the same as missing ones.
    const params = Object.fromEntries(
      [...new URL(request.url).searchParams].filter(([, v]) => v !== ""),
    );
    return Response.json(await listStudents(parseInput(listStudentsQuerySchema, params)));
  } catch (err) {
    return errorResponse(err);
  }
}

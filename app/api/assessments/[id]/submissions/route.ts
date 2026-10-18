import { MAX_UPLOAD_BYTES } from "@/lib/constants";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ApiError, errorResponse } from "@/lib/http";
import { submitWork } from "@/lib/services/submissions";

// Multipart: a single "file" field. Students only.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/assessments/[id]/submissions">,
) {
  try {
    const user = await requireRole("STUDENT");
    const { id } = await ctx.params;

    const student = await prisma.student.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });
    if (!student) {
      throw new ApiError(403, "NO_STUDENT_RECORD", "No student record is linked to this account");
    }

    // Refuse an obviously oversized body before reading it. The exact size is
    // checked again on the file itself.
    const declared = Number(request.headers.get("content-length") ?? 0);
    if (declared > MAX_UPLOAD_BYTES + 64 * 1024) {
      throw new ApiError(413, "FILE_TOO_LARGE", "The file is larger than the 10 MB limit");
    }

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) {
      throw new ApiError(400, "VALIDATION_ERROR", "Choose a file to upload", {
        file: ["Choose a file to upload"],
      });
    }

    const submission = await submitWork(student.id, id, {
      name: file.name,
      type: file.type,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    // The storage key is internal and is never sent to the client.
    return Response.json(
      {
        submission: {
          id: submission.id,
          assessmentId: submission.assessmentId,
          originalName: submission.originalName,
          sizeBytes: submission.sizeBytes,
          submittedAt: submission.submittedAt,
          isLate: submission.isLate,
        },
      },
      { status: 201 },
    );
  } catch (err) {
    return errorResponse(err);
  }
}

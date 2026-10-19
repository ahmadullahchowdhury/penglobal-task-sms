import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { getSubmissionFile } from "@/lib/services/submissions";

// Files are only ever served here, after the role and ownership checks.
export async function GET(_request: Request, ctx: RouteContext<"/api/submissions/[id]/file">) {
  try {
    const user = await requireRole("STAFF", "STUDENT");
    const { id } = await ctx.params;
    const file = await getSubmissionFile(id, user);

    // ASCII fallback plus the UTF-8 form, so any original name survives.
    const fallback = file.originalName.replace(/[^\x20-\x7e]|["\\]/g, "_");
    return new Response(new Uint8Array(file.bytes), {
      headers: {
        "Content-Type": file.mimeType,
        "Content-Length": String(file.bytes.length),
        "Content-Disposition": `attachment; filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(file.originalName)}`,
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return errorResponse(err);
  }
}

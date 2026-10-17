import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { recordPayment } from "@/lib/services/fees";
import { recordPaymentSchema } from "@/lib/validation/payments";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/students/[id]/payments">,
) {
  try {
    const user = await requireRole("REGISTRY_ADMIN");
    const { id } = await ctx.params;
    const input = parseInput(recordPaymentSchema, await readJson(request));
    const payment = await recordPayment(id, input, user.id);
    return Response.json({ payment }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

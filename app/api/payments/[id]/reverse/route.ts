import { requireRole } from "@/lib/auth";
import { errorResponse } from "@/lib/http";
import { parseInput, readJson } from "@/lib/parse-input";
import { reversePayment } from "@/lib/services/fees";
import { reversePaymentSchema } from "@/lib/validation/payments";

export async function POST(
  request: Request,
  ctx: RouteContext<"/api/payments/[id]/reverse">,
) {
  try {
    const user = await requireRole("REGISTRY_ADMIN");
    const { id } = await ctx.params;
    const input = parseInput(reversePaymentSchema, await readJson(request));
    const reversal = await reversePayment(id, input, user.id);
    return Response.json({ reversal }, { status: 201 });
  } catch (err) {
    return errorResponse(err);
  }
}

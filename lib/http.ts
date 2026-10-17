import { unstable_rethrow } from "next/navigation";

// Every API error leaves the server as { error: { code, message, fields? } }.
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public fields?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export function errorResponse(err: unknown): Response {
  if (err instanceof ApiError) {
    return Response.json(
      { error: { code: err.code, message: err.message, fields: err.fields } },
      { status: err.status },
    );
  }
  // Let Next's own control-flow errors (prerender bailout, redirect) pass through.
  unstable_rethrow(err);
  console.error(err);
  return Response.json(
    { error: { code: "INTERNAL", message: "Something went wrong" } },
    { status: 500 },
  );
}

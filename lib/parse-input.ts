import { z } from "zod";
import { ApiError } from "@/lib/http";

// Parse input with a Zod schema or throw a 400 with field-level errors.
export function parseInput<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiError(
      400,
      "VALIDATION_ERROR",
      "Invalid request",
      z.flattenError(result.error).fieldErrors as Record<string, string[]>,
    );
  }
  return result.data;
}

// Read a JSON body, turning a malformed one into a 400.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new ApiError(400, "INVALID_JSON", "Request body must be valid JSON");
  }
}

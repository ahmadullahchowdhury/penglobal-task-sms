import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { homePathFor } from "@/lib/domain/roles";
import { ApiError } from "@/lib/http";

// Demo stand-in for a session: the cookie holds a seeded user id and the role
// is always read from the database, never from the cookie. See DECISIONS.md, section 8.
export const SESSION_COOKIE = "sms_user";

export async function getCurrentUser() {
  const id = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!id) return null;
  return prisma.user.findUnique({ where: { id } });
}

// For API routes. Throws ApiError, which errorResponse() turns into 401 or 403.
export async function requireRole(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError(401, "UNAUTHENTICATED", "Select a user to continue");
  }
  if (!roles.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "You do not have access to this resource");
  }
  return user;
}

// For pages and layouts. Redirects instead of throwing.
export async function requirePageRole(...roles: Role[]) {
  const user = await getCurrentUser();
  if (!user) redirect("/");
  if (!roles.includes(user.role)) redirect(homePathFor(user.role));
  return user;
}

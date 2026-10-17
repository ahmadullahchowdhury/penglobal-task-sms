import { redirect } from "next/navigation";
import { requirePageRole } from "@/lib/auth";
import { ROLE_LABELS, STAFF_AREA_ROLES } from "@/lib/domain/roles";

export default async function StaffHome() {
  const user = await requirePageRole(...STAFF_AREA_ROLES);
  if (user.role === "REGISTRY_ADMIN") redirect("/staff/dashboard");

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Staff dashboard</h1>
      <p className="text-muted-foreground">
        Signed in as {user.name} ({ROLE_LABELS[user.role]}).
      </p>
    </div>
  );
}

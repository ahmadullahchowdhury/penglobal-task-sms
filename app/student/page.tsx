import { requirePageRole } from "@/lib/auth";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";

export default async function StudentHome() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">My dashboard</h1>
      <p className="text-muted-foreground">Signed in as {user.name}.</p>
    </div>
  );
}

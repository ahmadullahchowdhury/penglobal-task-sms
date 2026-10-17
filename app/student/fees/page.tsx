import { FeesView } from "@/components/fees-view";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";
import { getFees } from "@/lib/services/fees";

export default async function StudentFeesPage() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  // A student only ever sees the record linked to their own login.
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">My fees</h1>
      {student ? (
        <FeesView fees={await getFees(student.id)} canManage={false} />
      ) : (
        <p className="text-muted-foreground">No student record is linked to this account.</p>
      )}
    </div>
  );
}

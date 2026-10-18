import { Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { FeesView } from "@/components/fees-view";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader title="My fees" description="Your charges, payments and what is left to pay." />
      {student ? (
        <FeesView fees={await getFees(student.id)} canManage={false} />
      ) : (
        <EmptyState
          icon={Wallet}
          title="No student record"
          description="No student record is linked to this account."
        />
      )}
    </div>
  );
}

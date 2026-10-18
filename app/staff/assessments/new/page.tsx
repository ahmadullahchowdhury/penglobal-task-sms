import { PageHeader } from "@/components/page-header";
import { CreateAssessmentForm } from "@/components/create-assessment-form";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STAFF_AREA_ROLES } from "@/lib/domain/roles";

export default async function NewAssessmentPage() {
  await requirePageRole(...STAFF_AREA_ROLES);

  const modules = await prisma.module.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true, programme: { select: { code: true } } },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/staff/assessments", label: "Assessments" }}
        title="New assessment"
        description="Create a draft now and open it when students should see it."
      />
      <div className="surface max-w-2xl p-6">
      <CreateAssessmentForm
        modules={modules.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          programmeCode: m.programme.code,
        }))}
      />
      </div>
    </div>
  );
}

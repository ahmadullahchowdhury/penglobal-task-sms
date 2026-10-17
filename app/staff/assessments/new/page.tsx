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
      <h1 className="text-2xl font-semibold">New assessment</h1>
      <CreateAssessmentForm
        modules={modules.map((m) => ({
          id: m.id,
          code: m.code,
          name: m.name,
          programmeCode: m.programme.code,
        }))}
      />
    </div>
  );
}

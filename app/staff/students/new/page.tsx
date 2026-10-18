import { PageHeader } from "@/components/page-header";
import { CreateStudentForm } from "@/components/create-student-form";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function NewStudentPage() {
  await requirePageRole("REGISTRY_ADMIN");

  const programmes = await prisma.programme.findMany({
    orderBy: { code: "asc" },
    select: { id: true, code: true, name: true },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        back={{ href: "/staff/students", label: "Students" }}
        title="Add student"
        description="A student number and their first fee charge are created automatically."
      />
      <div className="surface max-w-2xl p-6">
        <CreateStudentForm programmes={programmes} defaultYear={new Date().getFullYear()} />
      </div>
    </div>
  );
}

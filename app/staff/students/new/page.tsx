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
      <h1 className="text-2xl font-semibold">Add student</h1>
      <CreateStudentForm programmes={programmes} defaultYear={new Date().getFullYear()} />
    </div>
  );
}

import { ChevronRight, ClipboardList } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/lib/auth";
import { ROLE_LABELS, STAFF_AREA_ROLES } from "@/lib/domain/roles";

export default async function StaffHome() {
  const user = await requirePageRole(...STAFF_AREA_ROLES);
  if (user.role === "REGISTRY_ADMIN") redirect("/staff/dashboard");

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description={`Signed in as ${user.name} (${ROLE_LABELS[user.role]}).`}
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/staff/assessments"
          className="surface group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
        >
          <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
            <ClipboardList className="size-5" />
          </span>
          <span className="space-y-1">
            <span className="flex items-center justify-between font-semibold">
              Assessments
              <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </span>
            <span className="block text-sm text-muted-foreground">
              Set work, review submissions and publish marks.
            </span>
          </span>
        </Link>
      </div>
    </div>
  );
}

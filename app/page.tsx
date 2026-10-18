import { GraduationCap } from "lucide-react";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/page-header";
import { RolePicker } from "@/components/role-picker";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { homePathFor, ROLE_LABELS } from "@/lib/domain/roles";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  const switcherEnabled = process.env.DEMO_ROLE_SWITCHER === "true";
  const users = switcherEnabled
    ? await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] })
    : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Registry"
        description={
          switcherEnabled
            ? 'Pick who to view the app as. You can change it any time from the "Viewing as" menu.'
            : "Sign in to continue."
        }
      />

      {switcherEnabled && users.length === 0 && (
        <div className="surface flex items-center gap-3 p-5 text-sm text-muted-foreground">
          <GraduationCap className="size-5" />
          No users yet. Run <code className="rounded bg-muted px-1.5 py-0.5">npm run db:seed</code> to
          load the demo data.
        </div>
      )}

      {users.length > 0 && (
        <RolePicker
          users={users.map((u) => ({
            id: u.id,
            name: u.name,
            role: u.role,
            roleLabel: ROLE_LABELS[u.role],
          }))}
        />
      )}
    </div>
  );
}

import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { homePathFor, ROLE_LABELS } from "@/lib/domain/roles";
import { RoleSwitcher } from "@/components/role-switcher";

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const switcherEnabled = process.env.DEMO_ROLE_SWITCHER === "true";

  const users = switcherEnabled
    ? await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] })
    : [];

  return (
    <>
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="font-semibold">
              Student Management System
            </Link>
            {user && (
              <Link
                href={homePathFor(user.role)}
                className="text-muted-foreground hover:text-foreground"
              >
                {user.role === "STUDENT" ? "My dashboard" : "Dashboard"}
              </Link>
            )}
            {user?.role === "REGISTRY_ADMIN" && (
              <Link
                href="/staff/students"
                className="text-muted-foreground hover:text-foreground"
              >
                Students
              </Link>
            )}
          </nav>
          {switcherEnabled && (
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900 dark:bg-amber-900/30 dark:text-amber-200">
                Demo mode: role switcher stands in for real authentication
              </span>
              <RoleSwitcher
                currentUserId={user?.id ?? null}
                users={users.map((u) => ({
                  id: u.id,
                  name: u.name,
                  roleLabel: ROLE_LABELS[u.role],
                }))}
              />
            </div>
          )}
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}

import { GraduationCap, Info } from "lucide-react";
import Link from "next/link";
import { NavLinks, type NavItem } from "@/components/nav-links";
import { PageTransition } from "@/components/page-transition";
import { RoleSwitcher } from "@/components/role-switcher";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { homePathFor, ROLE_LABELS } from "@/lib/domain/roles";

function navFor(role: "REGISTRY_ADMIN" | "STAFF" | "STUDENT"): NavItem[] {
  switch (role) {
    case "REGISTRY_ADMIN":
      return [
        { href: "/staff/dashboard", label: "Dashboard", icon: "dashboard" },
        { href: "/staff/students", label: "Students", icon: "students" },
      ];
    case "STAFF":
      return [
        { href: "/staff", label: "Dashboard", icon: "dashboard", exact: true },
        { href: "/staff/assessments", label: "Assessments", icon: "assessments" },
      ];
    case "STUDENT":
      return [
        { href: "/student", label: "My dashboard", icon: "dashboard", exact: true },
        { href: "/student/assessments", label: "Assessments", icon: "assessments" },
        { href: "/student/results", label: "Results", icon: "results" },
        { href: "/student/fees", label: "Fees", icon: "fees" },
      ];
  }
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

export async function AppShell({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const users = await prisma.user.findMany({ orderBy: [{ role: "asc" }, { name: "asc" }] });

  return (
    <div className="md:flex md:min-h-screen">
      <aside className="bg-ink text-white md:sticky md:top-0 md:flex md:h-screen md:w-60 md:shrink-0 md:flex-col md:shadow-[1px_0_0_oklch(1_0_0/8%)]">
        <div className="flex flex-col gap-4 px-4 py-4 md:h-full md:gap-6 md:px-3 md:py-5">
          <Link href="/" className="group flex items-center gap-3 px-1">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-ink shadow-sm transition-transform group-hover:-rotate-6">
              <GraduationCap className="size-5" />
            </span>
            <span className="leading-tight">
              <span className="block font-heading text-lg font-bold tracking-tight">Registry</span>
              <span className="block text-[0.7rem] text-white/60">Student management</span>
            </span>
          </Link>

          {user && <NavLinks items={navFor(user.role)} />}

        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border bg-card/90 px-4 py-2.5 backdrop-blur md:px-8">
          <div className="min-h-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-warning/30 bg-warning/15 px-3 py-1 text-xs font-medium text-[oklch(0.42_0.09_65)]">
              <Info className="size-3.5 shrink-0" />
              Demo mode: role switcher stands in for real authentication
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <RoleSwitcher
              currentUserId={user?.id ?? null}
              users={users.map((u) => ({
                id: u.id,
                name: u.name,
                roleLabel: ROLE_LABELS[u.role],
              }))}
            />
            {user && (
              <Link
                href={homePathFor(user.role)}
                className="flex items-center gap-2.5 rounded-full border border-border bg-card py-1 pl-1 pr-4 shadow-xs transition-colors hover:bg-accent"
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                  {initials(user.name)}
                </span>
                <span className="leading-tight">
                  <span className="block text-sm font-medium">{user.name}</span>
                  <span className="block text-xs text-muted-foreground">{ROLE_LABELS[user.role]}</span>
                </span>
              </Link>
            )}
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 md:px-8">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>
    </div>
  );
}

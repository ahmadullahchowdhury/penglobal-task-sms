import {
  CircleCheck,
  ClipboardCheck,
  Clock,
  EyeOff,
  FileCheck,
  FolderOpen,
  Plus,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AssessmentStateBadge } from "@/components/assessment-state-badge";
import { ClassificationBadge } from "@/components/classification-badge";
import { EmptyState } from "@/components/empty-state";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { buttonVariants } from "@/components/ui/button";
import { requirePageRole } from "@/lib/auth";
import type { Classification } from "@/lib/domain/classification";
import { STAFF_AREA_ROLES } from "@/lib/domain/roles";
import { getStaffDashboard } from "@/lib/services/staff-dashboard";
import { cn } from "@/lib/utils";

const BAR: Record<Classification, string> = {
  Distinction: "bg-info",
  Merit: "bg-success",
  Pass: "bg-muted-foreground/50",
  Fail: "bg-destructive",
};

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export default async function StaffHome() {
  const user = await requirePageRole(...STAFF_AREA_ROLES);
  if (user.role === "REGISTRY_ADMIN") redirect("/staff/dashboard");

  const d = await getStaffDashboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${user.name.split(" ")[0]}`}
        description="Marking, submissions and results at a glance. Work waiting on you comes first."
        actions={
          <Link href="/staff/assessments/new" className={buttonVariants()}>
            <Plus className="size-4" />
            New assessment
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={FolderOpen}
          tone="success"
          label="Open assessments"
          value={String(d.openCount)}
          hint={`${plural(d.draftCount, "draft")} · ${plural(d.closedCount, "closed assessment")}`}
        />
        <StatCard
          icon={ClipboardCheck}
          tone={d.toGrade > 0 ? "info" : "neutral"}
          label="Waiting to be graded"
          value={String(d.toGrade)}
          hint="Submissions with no score yet"
        />
        <StatCard
          icon={EyeOff}
          tone={d.withheld > 0 ? "warning" : "neutral"}
          label="Graded, not published"
          value={String(d.withheld)}
          hint="Students cannot see these yet"
        />
        <StatCard
          icon={Clock}
          tone={d.late > 0 ? "danger" : "neutral"}
          label="Late submissions"
          value={String(d.late)}
          hint="Across all assessments"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <h2 className="text-lg">Needs marking</h2>
          {d.needsMarking.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="Nothing waiting"
              description="Every submission is graded and published."
            />
          ) : (
            <ul className="surface divide-y">
              {d.needsMarking.map((a) => {
                const pct = a.submitted === 0 ? 0 : Math.round((a.graded / a.submitted) * 100);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-48 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          href={`/staff/assessments/${a.id}`}
                          className="font-medium underline-offset-4 hover:underline"
                        >
                          {a.title}
                        </Link>
                        <span className="font-mono text-xs text-muted-foreground">
                          {a.moduleCode}
                        </span>
                        <AssessmentStateBadge state={a.state} />
                      </div>
                      <div className="flex items-center gap-3">
                        <div
                          role="progressbar"
                          aria-label={`${a.title} graded`}
                          aria-valuenow={pct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          className="h-2 flex-1 overflow-hidden rounded-full bg-muted"
                        >
                          <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">
                          {a.graded}/{a.submitted} graded
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {[
                          a.toGrade > 0 && `${a.toGrade} to grade`,
                          a.withheld > 0 && `${a.withheld} not published`,
                          a.late > 0 && `${a.late} late`,
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <Link
                      href={`/staff/assessments/${a.id}/marksheet`}
                      className={buttonVariants({ variant: "outline" })}
                    >
                      <FileCheck className="size-4" />
                      Marksheet
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3 lg:col-span-2">
          <h2 className="text-lg">Open for submissions</h2>
          {d.openAssessments.length === 0 ? (
            <EmptyState
              icon={FolderOpen}
              title="No open assessments"
              description="Open a draft so students can submit."
            />
          ) : (
            <ul className="surface divide-y">
              {d.openAssessments.map((a) => (
                <li key={a.id} className="space-y-1 p-4">
                  <Link
                    href={`/staff/assessments/${a.id}`}
                    className="font-medium underline-offset-4 hover:underline"
                  >
                    {a.title}
                  </Link>
                  <p className="text-xs text-muted-foreground">
                    {a.moduleCode} · due <LocalTime iso={a.deadline.toISOString()} />
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {plural(a.submitted, "submission")}
                    {a.late > 0 && ` · ${a.late} late`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg">Published results</h2>
        {d.publishedTotal === 0 ? (
          <EmptyState
            icon={EyeOff}
            title="No published results yet"
            description="Results appear here once you publish grades to students."
          />
        ) : (
          <div className="surface space-y-4 p-5">
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {(Object.keys(d.distribution) as Classification[]).map((c) => (
                <div
                  key={c}
                  title={`${c}: ${d.distribution[c]}`}
                  className={cn("h-full", BAR[c])}
                  style={{ width: `${(d.distribution[c] / d.publishedTotal) * 100}%` }}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3">
              {(Object.keys(d.distribution) as Classification[]).map((c) => (
                <div key={c} className="flex items-center gap-2">
                  <span className={cn("size-2.5 rounded-full", BAR[c])} />
                  <ClassificationBadge classification={c} />
                  <span className="text-sm font-semibold tabular-nums">{d.distribution[c]}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              Across {plural(d.publishedTotal, "published grade")}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

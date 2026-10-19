import {
  CalendarClock,
  CircleCheck,
  ClipboardList,
  Hourglass,
  TriangleAlert,
  Trophy,
  Upload,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { ClassificationBadge } from "@/components/classification-badge";
import { EmptyState } from "@/components/empty-state";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { averageScore } from "@/lib/domain/grade";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";
import { decideSubmission } from "@/lib/domain/submission";
import { academicYearLabel, describeDeadline } from "@/lib/format";
import { formatMoney } from "@/lib/money";
import { getFees } from "@/lib/services/fees";
import { getStudentResultsView } from "@/lib/services/grades";
import { listAssessmentsForStudent } from "@/lib/services/submissions";
import { cn } from "@/lib/utils";

const SCORE_TONE = {
  Distinction: "bg-info/12 text-info",
  Merit: "bg-success/12 text-success",
  Pass: "bg-muted text-foreground",
  Fail: "bg-destructive/10 text-destructive",
} as const;

export default async function StudentHome() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);
  const firstName = user.name.split(" ")[0];

  // A student only ever sees the record linked to their own login.
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      studentNumber: true,
      status: true,
      academicYear: true,
      programme: { select: { code: true, name: true } },
    },
  });

  if (!student) {
    return (
      <div className="space-y-8">
        <PageHeader title={`Welcome, ${firstName}`} />
        <EmptyState
          icon={ClipboardList}
          title="No student record"
          description="No student record is linked to this account."
        />
      </div>
    );
  }

  const now = new Date();
  const [assessments, results, fees] = await Promise.all([
    listAssessmentsForStudent(student.id),
    getStudentResultsView(student.id),
    getFees(student.id, now),
  ]);

  // Open work the student can still hand in, soonest deadline first.
  const todo = assessments
    .filter((a) => a.submissions.length === 0)
    .filter((a) =>
      decideSubmission({
        studentStatus: student.status,
        assessmentState: a.state,
        hasExisting: false,
        deadline: a.deadline,
        now,
      }).ok,
    );
  const submittedCount = assessments.filter((a) => a.submissions.length > 0).length;
  const average = averageScore(results.published.map((r) => r.score));
  const latest = results.published.slice(0, 3);
  const overdue = fees.overdue.overdueAmount > 0;

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome, ${firstName}`}
        description={
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-xs">{student.studentNumber}</span>
            <span>
              · {student.programme.code} {student.programme.name} ·{" "}
              {academicYearLabel(student.academicYear)}
            </span>
            <StatusBadge status={student.status} />
          </span>
        }
      />

      {overdue && (
        <Link
          href="/student/fees"
          className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive"
        >
          <TriangleAlert className="size-5 shrink-0" />
          <span>
            <span className="font-semibold">{formatMoney(fees.overdue.overdueAmount)} is overdue</span>{" "}
            by {fees.overdue.daysOverdue} {fees.overdue.daysOverdue === 1 ? "day" : "days"}. View your
            fees.
          </span>
        </Link>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Upload}
          tone={todo.length > 0 ? "warning" : "success"}
          label="To submit"
          value={String(todo.length)}
          hint={todo.length > 0 ? "Open work you haven't handed in" : "You're up to date"}
        />
        <StatCard
          icon={CircleCheck}
          tone="success"
          label="Submitted"
          value={`${submittedCount}/${assessments.length}`}
          hint="Assessments for your programme"
        />
        <StatCard
          icon={Trophy}
          tone="info"
          label="Average score"
          value={average === null ? "–" : String(average)}
          hint={
            average === null
              ? "No published results yet"
              : `Across ${results.published.length} published ${results.published.length === 1 ? "result" : "results"}`
          }
        />
        <StatCard
          icon={Wallet}
          tone={overdue ? "danger" : fees.balance > 0 ? "info" : "success"}
          label="Fee balance"
          value={formatMoney(fees.balance)}
          hint={overdue ? "Includes overdue fees" : fees.balance > 0 ? "Nothing overdue" : "Fully paid"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <section className="space-y-3 lg:col-span-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Due next</h2>
            <Link href="/student/assessments" className="text-sm text-info underline-offset-4 hover:underline">
              All assessments
            </Link>
          </div>
          {todo.length === 0 ? (
            <EmptyState
              icon={CircleCheck}
              title="Nothing to submit"
              description="You've handed in everything that's currently open."
            />
          ) : (
            <ul className="surface divide-y">
              {todo.map((a) => {
                const deadline = describeDeadline(a.deadline, now);
                return (
                  <li key={a.id} className="flex flex-wrap items-center gap-4 p-4">
                    <div className="min-w-48 flex-1 space-y-1">
                      <p className="font-medium">{a.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.module.code} · {a.module.name}
                      </p>
                      <p className="flex flex-wrap items-center gap-x-1.5 text-xs">
                        <CalendarClock className="size-3.5 text-muted-foreground" />
                        <LocalTime iso={a.deadline.toISOString()} />
                        <span className={deadline.overdue ? "text-destructive" : "text-muted-foreground"}>
                          · {deadline.text}
                        </span>
                      </p>
                    </div>
                    <Link href="/student/assessments" className={buttonVariants({ variant: "outline" })}>
                      <Upload className="size-4" />
                      Submit
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Latest results</h2>
            <Link href="/student/results" className="text-sm text-info underline-offset-4 hover:underline">
              All results
            </Link>
          </div>
          {latest.length === 0 && results.pending.length === 0 ? (
            <EmptyState
              icon={Trophy}
              title="No results yet"
              description="Published marks appear here."
            />
          ) : (
            <ul className="surface divide-y">
              {latest.map((r) => (
                <li key={r.assessmentId} className="flex items-center gap-3 p-4">
                  <span
                    className={cn(
                      "grid size-12 shrink-0 place-items-center rounded-lg text-lg font-bold tabular-nums",
                      SCORE_TONE[r.classification],
                    )}
                  >
                    {r.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{r.title}</p>
                    <p className="text-xs text-muted-foreground">{r.module.code}</p>
                  </div>
                  <ClassificationBadge classification={r.classification} />
                </li>
              ))}
              {results.pending.length > 0 && (
                <li className="flex items-center gap-3 p-4 text-sm text-muted-foreground">
                  <Hourglass className="size-4" />
                  <span className="flex-1">
                    {results.pending.length} {results.pending.length === 1 ? "result" : "results"} pending
                  </span>
                  <Badge variant="warning">Awaiting</Badge>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

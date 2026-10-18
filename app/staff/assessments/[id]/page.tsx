import { CircleCheck, Clock, Download, FileCheck, Hourglass, Inbox } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { notFound } from "next/navigation";
import { AssessmentStateBadge } from "@/components/assessment-state-badge";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import { STAFF_AREA_ROLES } from "@/lib/domain/roles";
import { formatDuration, formatFileSize } from "@/lib/format";
import { ApiError } from "@/lib/http";
import { getAssessmentSubmissions } from "@/lib/services/submissions";

export default async function AssessmentDetailPage({
  params,
}: PageProps<"/staff/assessments/[id]">) {
  const user = await requirePageRole(...STAFF_AREA_ROLES);
  const { id } = await params;

  const view = await getAssessmentSubmissions(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  const { assessment, submissions, notSubmitted } = view;
  const lateCount = submissions.filter((s) => s.isLate).length;

  return (
    <div className="space-y-8">
      <PageHeader
        back={{ href: "/staff/assessments", label: "Assessments" }}
        title={assessment.title}
        description={
          <>
            {assessment.module.code} · {assessment.module.name} · Deadline{" "}
            <LocalTime iso={assessment.deadline.toISOString()} />
          </>
        }
        actions={
          <>
            <AssessmentStateBadge state={assessment.state} />
            {user.role === "STAFF" && (
              <Link
                href={`/staff/assessments/${assessment.id}/marksheet`}
                className={buttonVariants({ variant: "outline" })}
              >
                <FileCheck className="size-4" />
                Marksheet
              </Link>
            )}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Inbox} tone="success" label="Submitted" value={String(submissions.length)} />
        <StatCard
          icon={Clock}
          tone={lateCount > 0 ? "danger" : "neutral"}
          label="Late"
          value={String(lateCount)}
        />
        <StatCard
          icon={Hourglass}
          tone={notSubmitted.length > 0 ? "warning" : "neutral"}
          label="Not submitted"
          value={String(notSubmitted.length)}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Submissions</h2>
        {submissions.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="Nothing submitted yet"
            description="Submissions appear here as students upload their work."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Timing</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.student.fullName}{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.student.studentNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <LocalTime iso={s.submittedAt.toISOString()} />
                  </TableCell>
                  <TableCell>
                    {s.isLate ? (
                      <span className="flex items-center gap-2">
                        <Badge variant="destructive">
                          <Clock data-icon="inline-start" />
                          Late
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDuration(s.submittedAt.getTime() - assessment.deadline.getTime())}{" "}
                          after the deadline
                        </span>
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">On time</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <a
                      href={`/api/submissions/${s.id}/file`}
                      className="inline-flex items-center gap-1.5 font-medium text-info underline-offset-4 hover:underline"
                    >
                      <Download className="size-3.5" />
                      {s.originalName}
                    </a>{" "}
                    <span className="text-xs text-muted-foreground">
                      ({formatFileSize(s.sizeBytes)})
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Not submitted ({notSubmitted.length})</h2>
        {notSubmitted.length === 0 ? (
          <EmptyState
            icon={CircleCheck}
            title="Everyone has submitted"
            description="Every enrolled student in this programme has handed in work."
          />
        ) : (
          <ul className="surface max-w-xl divide-y divide-border">
            {notSubmitted.map((s) => (
              <li key={s.id} className="px-4 py-2 text-sm">
                {s.fullName}{" "}
                <span className="font-mono text-xs text-muted-foreground">{s.studentNumber}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

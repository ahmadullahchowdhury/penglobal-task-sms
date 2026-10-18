import Link from "next/link";
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
      <div>
        <Link
          href="/staff/assessments"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← Assessments
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{assessment.title}</h1>
            <p className="text-sm text-muted-foreground">
              {assessment.module.code} · {assessment.module.name} · Deadline{" "}
              <LocalTime iso={assessment.deadline.toISOString()} />
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AssessmentStateBadge state={assessment.state} />
            {user.role === "STAFF" && (
              <Link
                href={`/staff/assessments/${assessment.id}/marksheet`}
                className={buttonVariants({ variant: "outline" })}
              >
                Marksheet
              </Link>
            )}
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {submissions.length} submitted ({lateCount} late), {notSubmitted.length} not submitted
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Submissions</h2>
        {submissions.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing has been submitted yet.</p>
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
                        <Badge variant="destructive">Late</Badge>
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
                      className="underline underline-offset-4"
                    >
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
          <p className="text-sm text-muted-foreground">Every enrolled student has submitted.</p>
        ) : (
          <ul className="max-w-xl divide-y divide-border rounded-xl border border-border">
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

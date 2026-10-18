import Link from "next/link";
import { notFound } from "next/navigation";
import { AssessmentStateBadge } from "@/components/assessment-state-badge";
import { LocalTime } from "@/components/local-time";
import { MarksheetRow } from "@/components/marksheet-row";
import { PublishAllButton } from "@/components/publish-all-button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { requirePageRole } from "@/lib/auth";
import { ApiError } from "@/lib/http";
import { getMarksheet } from "@/lib/services/grades";

export default async function MarksheetPage({
  params,
}: PageProps<"/staff/assessments/[id]/marksheet">) {
  // Grading is for academic staff.
  await requirePageRole("STAFF");
  const { id } = await params;

  const sheet = await getMarksheet(id).catch((err) => {
    if (err instanceof ApiError && err.status === 404) notFound();
    throw err;
  });
  const { assessment, rows, notSubmitted } = sheet;
  const graded = rows.filter((r) => r.grade).length;
  const withheld = rows.filter((r) => r.grade && !r.grade.isPublished).length;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/staff/assessments/${assessment.id}`}
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ← {assessment.title}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">Marksheet: {assessment.title}</h1>
            <p className="text-sm text-muted-foreground">
              {assessment.module.code} · {assessment.module.name} · Deadline{" "}
              <LocalTime iso={assessment.deadline.toISOString()} />
            </p>
          </div>
          <AssessmentStateBadge state={assessment.state} />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {rows.length} submitted, {graded} graded, {withheld} withheld from students
        </p>
      </div>

      <PublishAllButton assessmentId={assessment.id} />

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Student</TableHead>
            <TableHead>Submission</TableHead>
            <TableHead>Score (0 to 100)</TableHead>
            <TableHead>Classification</TableHead>
            <TableHead>Student sees</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r) => (
            <MarksheetRow
              key={r.student.id}
              assessmentId={assessment.id}
              studentId={r.student.id}
              studentName={r.student.fullName}
              studentNumber={r.student.studentNumber}
              isLate={r.isLate}
              fileName={r.originalName}
              submissionId={r.submissionId}
              grade={r.grade}
            />
          ))}
          {notSubmitted.map((s) => (
            <TableRow key={s.id} className="text-muted-foreground">
              <TableCell>
                {s.fullName} <span className="font-mono text-xs">{s.studentNumber}</span>
              </TableCell>
              <TableCell>
                <Badge variant="outline">Not submitted</Badge>
              </TableCell>
              <TableCell>
                <Input disabled aria-label={`Score for ${s.fullName}`} className="w-20" />
              </TableCell>
              <TableCell />
              <TableCell />
              <TableCell />
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

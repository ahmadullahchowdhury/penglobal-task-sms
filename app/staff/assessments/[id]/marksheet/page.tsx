import { ClipboardCheck, EyeOff, Inbox } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
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
      <PageHeader
        back={{ href: `/staff/assessments/${assessment.id}`, label: assessment.title }}
        title={`Marksheet: ${assessment.title}`}
        description={
          <>
            {assessment.module.code} · {assessment.module.name} · Deadline{" "}
            <LocalTime iso={assessment.deadline.toISOString()} />
          </>
        }
        actions={<AssessmentStateBadge state={assessment.state} />}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={Inbox} label="Submitted" value={String(rows.length)} />
        <StatCard icon={ClipboardCheck} tone="success" label="Graded" value={String(graded)} />
        <StatCard
          icon={EyeOff}
          tone={withheld > 0 ? "warning" : "neutral"}
          label="Withheld from students"
          value={String(withheld)}
        />
      </div>

      {rows.length === 0 && (
        <EmptyState
          icon={ClipboardCheck}
          title="Nothing to grade yet"
          description={
            assessment.state === "DRAFT"
              ? "Open the assessment so students can submit."
              : "No student has submitted work for this assessment."
          }
        />
      )}

      {rows.length > 0 && <PublishAllButton assessmentId={assessment.id} pending={withheld} />}

      {(rows.length > 0 || notSubmitted.length > 0) && (
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
      )}
    </div>
  );
}

import { AssessmentStateBadge } from "@/components/assessment-state-badge";
import { LocalTime } from "@/components/local-time";
import { SubmissionProgressBadge } from "@/components/submission-progress-badge";
import { SubmissionUpload } from "@/components/submission-upload";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";
import { decideSubmission, submissionProgress } from "@/lib/domain/submission";
import { describeDeadline, formatDuration, formatFileSize } from "@/lib/format";
import { listAssessmentsForStudent } from "@/lib/services/submissions";

export default async function StudentAssessmentsPage() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  // A student only ever sees the record linked to their own login.
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true, status: true },
  });
  if (!student) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <p className="text-muted-foreground">No student record is linked to this account.</p>
      </div>
    );
  }

  const assessments = await listAssessmentsForStudent(student.id);
  const now = new Date();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Assessments</h1>

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No assessments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Assessments for your programme appear here once they are open.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {assessments.map((a) => {
            const submission = a.submissions[0] ?? null;
            const decision = decideSubmission({
              studentStatus: student.status,
              assessmentState: a.state,
              hasExisting: submission !== null,
              deadline: a.deadline,
              now,
            });
            const deadline = describeDeadline(a.deadline, now);
            const pastDeadline = now.getTime() > a.deadline.getTime();

            return (
              <li key={a.id} className="space-y-3 rounded-xl border border-border p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="font-semibold">{a.title}</h2>
                    <p className="text-sm text-muted-foreground">
                      {a.module.code} · {a.module.name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <AssessmentStateBadge state={a.state} />
                    <SubmissionProgressBadge progress={submissionProgress(submission)} />
                  </div>
                </div>

                <p className="text-sm">
                  Deadline: <LocalTime iso={a.deadline.toISOString()} />
                  {a.state === "OPEN" && (
                    <span className={deadline.overdue ? " text-destructive" : " text-muted-foreground"}>
                      {" "}
                      · {deadline.text}
                    </span>
                  )}
                </p>

                {submission && (
                  <div className="text-sm">
                    <p>
                      <a
                        href={`/api/submissions/${submission.id}/file`}
                        className="font-medium underline underline-offset-4"
                      >
                        {submission.originalName}
                      </a>{" "}
                      <span className="text-muted-foreground">
                        ({formatFileSize(submission.sizeBytes)}) · submitted{" "}
                        <LocalTime iso={submission.submittedAt.toISOString()} />
                      </span>
                    </p>
                    {submission.isLate && (
                      <p className="text-destructive">
                        Submitted {formatDuration(submission.submittedAt.getTime() - a.deadline.getTime())}{" "}
                        after the deadline.
                      </p>
                    )}
                  </div>
                )}

                {decision.ok ? (
                  <div className="space-y-2">
                    {decision.mode === "create" && pastDeadline && (
                      <p className="text-sm text-destructive">
                        The deadline has passed. You can still submit once, and it will be marked late.
                      </p>
                    )}
                    {decision.mode === "replace" && (
                      <p className="text-sm text-muted-foreground">
                        You can replace your file until the deadline.
                      </p>
                    )}
                    <SubmissionUpload
                      assessmentId={a.id}
                      label={decision.mode === "replace" ? "Replace file" : "Submit"}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {decision.code === "NOT_OPEN"
                      ? submission
                        ? "This assessment is closed."
                        : "This assessment is closed and you did not submit."
                      : decision.message}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

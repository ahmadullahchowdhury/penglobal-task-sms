import Link from "next/link";
import { AssessmentActions } from "@/components/assessment-actions";
import { AssessmentStateBadge } from "@/components/assessment-state-badge";
import { LocalTime } from "@/components/local-time";
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
import { allowedAssessmentTransitions } from "@/lib/domain/assessment";
import { STAFF_AREA_ROLES } from "@/lib/domain/roles";
import { listAssessments } from "@/lib/services/assessments";

export default async function AssessmentsPage() {
  await requirePageRole(...STAFF_AREA_ROLES);
  const assessments = await listAssessments({});

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Assessments</h1>
        <Link href="/staff/assessments/new" className={buttonVariants()}>
          New assessment
        </Link>
      </div>

      {assessments.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">No assessments yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create a draft, then open it when students should see it.
          </p>
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Module</TableHead>
              <TableHead>Deadline</TableHead>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Submissions</TableHead>
              <TableHead className="text-right">Late</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>
                  {a.module.code}{" "}
                  <span className="text-muted-foreground">({a.module.programme.code})</span>
                </TableCell>
                <TableCell>
                  <LocalTime iso={a.deadline.toISOString()} />
                </TableCell>
                <TableCell>
                  <AssessmentStateBadge state={a.state} />
                </TableCell>
                <TableCell className="text-right">{a.submissionCount}</TableCell>
                <TableCell className="text-right">{a.lateCount}</TableCell>
                <TableCell className="text-right">
                  <AssessmentActions
                    id={a.id}
                    actions={allowedAssessmentTransitions(a.state).map((to) =>
                      to === "OPEN"
                        ? { to, label: "Open" }
                        : {
                            to,
                            label: "Close",
                            confirm:
                              "No further submissions of any kind will be accepted, and a closed assessment cannot be reopened.",
                          },
                    )}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
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
      <PageHeader
        title="Assessments"
        description="Create work, open it for submissions and close it when the time is up."
        actions={
          <Link href="/staff/assessments/new" className={buttonVariants()}>
            <Plus className="size-4" />
            New assessment
          </Link>
        }
      />

      {assessments.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No assessments yet"
          description="Create a draft, then open it when students should see it."
          action={
            <Link href="/staff/assessments/new" className={buttonVariants()}>
              <Plus className="size-4" />
              New assessment
            </Link>
          }
        />
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
                <TableCell className="font-medium">
                  <Link
                    href={`/staff/assessments/${a.id}`}
                    className="underline-offset-4 hover:underline"
                  >
                    {a.title}
                  </Link>
                </TableCell>
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
                <TableCell className="text-right tabular-nums">{a.submissionCount}</TableCell>
                <TableCell
                  className={`text-right tabular-nums ${a.lateCount > 0 ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                >
                  {a.lateCount}
                </TableCell>
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

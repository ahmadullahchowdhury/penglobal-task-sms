import { Hourglass, Trophy } from "lucide-react";
import { ClassificationBadge } from "@/components/classification-badge";
import { EmptyState } from "@/components/empty-state";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import type { Classification } from "@/lib/domain/classification";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";
import { getStudentResultsView } from "@/lib/services/grades";
import { cn } from "@/lib/utils";

const SCORE_TONE: Record<Classification, string> = {
  Distinction: "bg-info/12 text-info",
  Merit: "bg-success/12 text-success",
  Pass: "bg-muted text-foreground",
  Fail: "bg-destructive/10 text-destructive",
};

export default async function StudentResultsPage() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  // A student only ever sees the record linked to their own login.
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="space-y-8">
      <PageHeader title="My results" description="Marks appear here once your tutor has published them." />
      {student ? (
        <Results studentId={student.id} />
      ) : (
        <EmptyState
          icon={Trophy}
          title="No student record"
          description="No student record is linked to this account."
        />
      )}
    </div>
  );
}

async function Results({ studentId }: { studentId: string }) {
  const { published, pending } = await getStudentResultsView(studentId);

  if (published.length === 0 && pending.length === 0) {
    return (
      <EmptyState
        icon={Trophy}
        title="No results yet"
        description="Results appear here once you have submitted work and it has been published."
      />
    );
  }

  return (
    <>
      {published.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg">Published</h2>
          <ul className="space-y-3">
            {published.map((r) => (
              <li key={r.assessmentId} className="surface flex flex-wrap items-center gap-4 p-4">
                <span
                  className={cn(
                    "grid size-16 shrink-0 place-items-center rounded-xl text-center",
                    SCORE_TONE[r.classification],
                  )}
                >
                  <span className="text-2xl font-bold leading-none tabular-nums">
                    {r.score}
                    <span className="block pt-0.5 text-[0.65rem] font-medium opacity-70">of 100</span>
                  </span>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.module.code} · {r.module.name}
                    {r.publishedAt && (
                      <>
                        {" "}
                        · published <LocalTime iso={r.publishedAt.toISOString()} />
                      </>
                    )}
                  </p>
                </div>
                <ClassificationBadge classification={r.classification} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg">Awaiting results</h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li key={r.assessmentId} className="surface flex flex-wrap items-center gap-4 p-4">
                <span className="grid size-16 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                  <Hourglass className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.module.code} · {r.module.name} · submitted{" "}
                    <LocalTime iso={r.submittedAt.toISOString()} />
                  </p>
                </div>
                <Badge variant="warning">Result pending</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

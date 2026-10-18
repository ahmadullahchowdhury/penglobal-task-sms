import { ClassificationBadge } from "@/components/classification-badge";
import { LocalTime } from "@/components/local-time";
import { Badge } from "@/components/ui/badge";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";
import { getStudentResultsView } from "@/lib/services/grades";

export default async function StudentResultsPage() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  // A student only ever sees the record linked to their own login.
  const student = await prisma.student.findUnique({
    where: { userId: user.id },
    select: { id: true },
  });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">My results</h1>
      {student ? (
        <Results studentId={student.id} />
      ) : (
        <p className="text-muted-foreground">No student record is linked to this account.</p>
      )}
    </div>
  );
}

async function Results({ studentId }: { studentId: string }) {
  const { published, pending } = await getStudentResultsView(studentId);

  if (published.length === 0 && pending.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border p-10 text-center">
        <p className="font-medium">No results yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Results appear here once you have submitted work and it has been published.
        </p>
      </div>
    );
  }

  return (
    <>
      {published.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Published</h2>
          <ul className="space-y-3">
            {published.map((r) => (
              <li
                key={r.assessmentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
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
                <div className="flex items-center gap-3">
                  <span className="text-2xl font-semibold">{r.score}/100</span>
                  <ClassificationBadge classification={r.classification} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {pending.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-semibold">Awaiting results</h2>
          <ul className="space-y-3">
            {pending.map((r) => (
              <li
                key={r.assessmentId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"
              >
                <div>
                  <p className="font-medium">{r.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {r.module.code} · {r.module.name} · submitted{" "}
                    <LocalTime iso={r.submittedAt.toISOString()} />
                  </p>
                </div>
                <Badge variant="secondary">Result pending</Badge>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/status-badge";
import { FeesView } from "@/components/fees-view";
import { StatusChangeDialog } from "@/components/status-change-dialog";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedTransitions, requiresReason, statusLabel } from "@/lib/domain/status";
import { academicYearLabel, formatDate, formatDateTime } from "@/lib/format";
import { getFees } from "@/lib/services/fees";
import { cn } from "@/lib/utils";

export default async function StudentDetailPage({
  params,
  searchParams,
}: PageProps<"/staff/students/[id]">) {
  await requirePageRole("REGISTRY_ADMIN");
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "fees" ? "fees" : "details";

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      programme: true,
      statusHistory: {
        orderBy: { createdAt: "desc" },
        include: { changedBy: { select: { name: true } } },
      },
    },
  });
  if (!student) notFound();

  const options = allowedTransitions(student.status).map((to) => ({
    value: to,
    label: statusLabel(to),
    reasonRequired: requiresReason(student.status, to),
  }));

  const details: [string, string][] = [
    ["Email", student.email],
    ["Date of birth", formatDate(student.dateOfBirth)],
    ["Programme", `${student.programme.code} · ${student.programme.name}`],
    ["Academic year", academicYearLabel(student.academicYear)],
    ["Enrolled on", formatDate(student.createdAt)],
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link href="/staff/students" className="text-sm text-muted-foreground hover:text-foreground">
          ← Students
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-semibold">{student.fullName}</h1>
            <p className="font-mono text-sm text-muted-foreground">{student.studentNumber}</p>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={student.status} />
            {options.length > 0 ? (
              <StatusChangeDialog studentId={student.id} options={options} />
            ) : (
              <span className="text-sm text-muted-foreground">No further status changes</span>
            )}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-border text-sm">
        {(
          [
            ["details", "Details", `/staff/students/${student.id}`],
            ["fees", "Fees", `/staff/students/${student.id}?tab=fees`],
          ] as const
        ).map(([key, label, href]) => (
          <Link
            key={key}
            href={href}
            aria-current={activeTab === key ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2",
              activeTab === key
                ? "border-foreground font-medium"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      {activeTab === "fees" ? (
        <FeesView fees={await getFees(student.id)} canManage />
      ) : (
        <>
      <dl className="grid max-w-xl grid-cols-[10rem_1fr] gap-x-4 gap-y-2 text-sm">
        {details.map(([label, value]) => (
          <div key={label} className="contents">
            <dt className="text-muted-foreground">{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Status history</h2>
        <ol className="max-w-xl divide-y divide-border rounded-xl border border-border">
          {student.statusHistory.map((h) => (
            <li key={h.id} className="space-y-0.5 px-4 py-3 text-sm">
              <p className="font-medium">
                {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : "Enrolled as "}
                {statusLabel(h.toStatus)}
              </p>
              <p className="text-muted-foreground">
                {formatDateTime(h.createdAt)}
                {h.changedBy ? ` · ${h.changedBy.name}` : ""}
              </p>
              {h.reason && <p>{h.reason}</p>}
            </li>
          ))}
        </ol>
      </section>
        </>
      )}
    </div>
  );
}

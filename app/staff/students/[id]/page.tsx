import { BookOpen, CalendarCheck, Cake, GraduationCap, History, Mail, UserRound, Wallet } from "lucide-react";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import { FeesView } from "@/components/fees-view";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { HeaderSkeleton, PanelSkeleton } from "@/components/skeletons";
import { StatusBadge } from "@/components/status-badge";
import { StatusChangeDialog } from "@/components/status-change-dialog";
import { TabNav } from "@/components/tab-nav";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedTransitions, requiresReason, statusLabel } from "@/lib/domain/status";
import { academicYearLabel, formatDate } from "@/lib/format";
import { getFees } from "@/lib/services/fees";
import { cn } from "@/lib/utils";

// Shared by the header and the details tab, so the page asks for it once per request.
const getStudent = cache(async (id: string) => {
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
  return student;
});

export default async function StudentDetailPage({
  params,
  searchParams,
}: PageProps<"/staff/students/[id]">) {
  await requirePageRole("REGISTRY_ADMIN");
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "fees" ? "fees" : "details";

  const tabs = [
    { key: "details", label: "Details", href: `/staff/students/${id}`, Icon: UserRound },
    { key: "fees", label: "Fees", href: `/staff/students/${id}?tab=fees`, Icon: Wallet },
  ] as const;

  // The header and each tab load on their own, so switching tabs only replaces the
  // tab's content with a loader instead of freezing the whole page.
  return (
    <div className="space-y-8">
      <Suspense fallback={<HeaderSkeleton />}>
        <StudentHeader id={id} />
      </Suspense>
      <TabNav tabs={tabs} active={activeTab} />
      <Suspense key={activeTab} fallback={<PanelSkeleton />}>
        {activeTab === "fees" ? <FeesTab id={id} /> : <DetailsTab id={id} />}
      </Suspense>
    </div>
  );
}

async function StudentHeader({ id }: { id: string }) {
  const student = await getStudent(id);
  const options = allowedTransitions(student.status).map((to) => ({
    value: to,
    label: statusLabel(to),
    reasonRequired: requiresReason(student.status, to),
  }));

  return (
    <PageHeader
      back={{ href: "/staff/students", label: "Students" }}
      title={student.fullName}
      description={<span className="font-mono text-sm">{student.studentNumber}</span>}
      actions={
        <>
          <StatusBadge status={student.status} />
          {options.length > 0 ? (
            <StatusChangeDialog studentId={student.id} options={options} />
          ) : (
            <span className="text-sm text-muted-foreground">No further status changes</span>
          )}
        </>
      }
    />
  );
}

async function FeesTab({ id }: { id: string }) {
  return <FeesView fees={await getFees(id)} canManage />;
}

async function DetailsTab({ id }: { id: string }) {
  const student = await getStudent(id);

  const details = [
    { Icon: Mail, label: "Email", value: student.email as React.ReactNode },
    { Icon: Cake, label: "Date of birth", value: formatDate(student.dateOfBirth) },
    { Icon: BookOpen, label: "Programme", value: `${student.programme.code} · ${student.programme.name}` },
    { Icon: GraduationCap, label: "Academic year", value: academicYearLabel(student.academicYear) },
    {
      Icon: CalendarCheck,
      label: "Enrolled on",
      value: <LocalTime iso={student.createdAt.toISOString()} dateOnly />,
    },
  ];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_1fr]">
      <section className="space-y-3">
        <h2 className="text-lg">Student details</h2>
        <dl className="surface divide-y divide-border">
          {details.map(({ Icon, label, value }) => (
            <div key={label} className="flex items-center gap-3 px-4 py-3 text-sm">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <dt className="w-32 shrink-0 text-muted-foreground">{label}</dt>
              <dd className="min-w-0 wrap-break-word font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg">
          <History className="size-5 text-muted-foreground" />
          Status history
        </h2>
        <ol className="surface space-y-0 p-4">
          {student.statusHistory.map((h, i) => (
            <li key={h.id} className="relative flex gap-3 pb-5 last:pb-0">
              {i < student.statusHistory.length - 1 && (
                <span aria-hidden className="absolute left-[0.4rem] top-4 h-full w-px bg-border" />
              )}
              <span
                aria-hidden
                className={cn(
                  "relative mt-1 size-[0.9rem] shrink-0 rounded-full border-2 border-card ring-2",
                  i === 0 ? "bg-primary ring-primary/25" : "bg-input ring-border",
                )}
              />
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium">
                  {h.fromStatus ? `${statusLabel(h.fromStatus)} → ` : "Enrolled as "}
                  {statusLabel(h.toStatus)}
                </p>
                <p className="text-muted-foreground">
                  <LocalTime iso={h.createdAt.toISOString()} />
                  {h.changedBy ? ` · ${h.changedBy.name}` : ""}
                </p>
                {h.reason && <p className="pt-0.5">{h.reason}</p>}
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}

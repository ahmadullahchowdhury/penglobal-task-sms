import { Cake, GraduationCap, History, Mail, UserRound, Wallet, CalendarCheck, BookOpen } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FeesView } from "@/components/fees-view";
import { LocalTime } from "@/components/local-time";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { StatusChangeDialog } from "@/components/status-change-dialog";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { allowedTransitions, requiresReason, statusLabel } from "@/lib/domain/status";
import { academicYearLabel, formatDate } from "@/lib/format";
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

  const tabs = [
    { key: "details", label: "Details", href: `/staff/students/${student.id}`, Icon: UserRound },
    { key: "fees", label: "Fees", href: `/staff/students/${student.id}?tab=fees`, Icon: Wallet },
  ] as const;

  return (
    <div className="space-y-8">
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

      <nav className="flex gap-1 border-b border-border">
        {tabs.map(({ key, label, href, Icon }) => (
          <Link
            key={key}
            href={href}
            aria-current={activeTab === key ? "page" : undefined}
            className={cn(
              "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
              activeTab === key
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:border-input hover:text-foreground",
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      {activeTab === "fees" ? (
        <FeesView fees={await getFees(student.id)} canManage />
      ) : (
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
      )}
    </div>
  );
}

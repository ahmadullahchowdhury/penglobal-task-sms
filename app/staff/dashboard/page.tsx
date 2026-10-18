import { AlertTriangle, CircleCheck, GraduationCap, Pause, LogOut, ShieldCheck, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatCard } from "@/components/stat-card";
import { StatusBadge } from "@/components/status-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrolmentStatus } from "@/generated/prisma/enums";
import { requirePageRole } from "@/lib/auth";
import { statusLabel } from "@/lib/domain/status";
import { formatMoney } from "@/lib/money";
import { getDashboard } from "@/lib/services/dashboard";
import { cn } from "@/lib/utils";

const STATUS_TILE = {
  ENROLLED: { Icon: CircleCheck, tone: "text-success bg-success/12" },
  DEFERRED: { Icon: Pause, tone: "text-[oklch(0.5_0.12_65)] bg-warning/18" },
  WITHDRAWN: { Icon: LogOut, tone: "text-destructive bg-destructive/10" },
  COMPLETED: { Icon: GraduationCap, tone: "text-info bg-info/12" },
} as const;

export default async function DashboardPage() {
  await requirePageRole("REGISTRY_ADMIN");
  const d = await getDashboard();

  return (
    <div className="space-y-8">
      <PageHeader
        title="Dashboard"
        description="Fees and enrolment at a glance. Problems come first."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          icon={Wallet}
          tone="info"
          label="Total outstanding"
          value={formatMoney(d.totalOutstanding)}
        />
        <StatCard
          icon={AlertTriangle}
          tone={d.totalOverdue > 0 ? "danger" : "success"}
          label="Total overdue"
          value={formatMoney(d.totalOverdue)}
          hint={`${d.overdueStudents.length} ${d.overdueStudents.length === 1 ? "student" : "students"} behind on fees`}
        />
        <StatCard icon={Users} label="Students" value={String(d.totalStudents)} />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg">Overdue fees</h2>
        {d.overdueStudents.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No overdue fees"
            description="Every student is up to date with their payments."
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Overdue amount</TableHead>
                <TableHead className="text-right">Days overdue</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {d.overdueStudents.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <Link
                      href={`/staff/students/${s.id}?tab=fees`}
                      className="font-medium underline-offset-4 hover:underline"
                    >
                      {s.fullName}
                    </Link>{" "}
                    <span className="font-mono text-xs text-muted-foreground">
                      {s.studentNumber}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                  <TableCell className="text-right font-medium tabular-nums">
                    {formatMoney(s.overdueAmount)}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right tabular-nums",
                      s.daysOverdue >= 30 && "font-semibold text-destructive",
                    )}
                  >
                    {s.daysOverdue}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg">Students by status</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(EnrolmentStatus).map((status) => {
            const { Icon, tone } = STATUS_TILE[status];
            return (
              <Link
                key={status}
                href={`/staff/students?status=${status}`}
                className="surface group flex items-center gap-3 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
              >
                <span className={cn("grid size-10 place-items-center rounded-lg", tone)}>
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm text-muted-foreground">{statusLabel(status)}</span>
                  <span className="block text-2xl font-bold leading-tight tabular-nums">
                    {d.countsByStatus[status]}
                  </span>
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}

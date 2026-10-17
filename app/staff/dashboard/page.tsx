import Link from "next/link";
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

export default async function DashboardPage() {
  await requirePageRole("REGISTRY_ADMIN");
  const d = await getDashboard();

  const stats = [
    { label: "Total outstanding", value: formatMoney(d.totalOutstanding) },
    { label: "Total overdue", value: formatMoney(d.totalOverdue) },
    { label: "Students", value: String(d.totalStudents) },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="rounded-xl border border-border p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="mt-1 text-2xl font-semibold">{s.value}</p>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Students by status</h2>
        <div className="flex flex-wrap gap-3">
          {Object.values(EnrolmentStatus).map((status) => (
            <Link
              key={status}
              href={`/staff/students?status=${status}`}
              className="rounded-xl border border-border px-4 py-3 hover:bg-muted"
            >
              <p className="text-sm text-muted-foreground">{statusLabel(status)}</p>
              <p className="text-xl font-semibold">{d.countsByStatus[status]}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Overdue fees</h2>
        {d.overdueStudents.length === 0 ? (
          <p className="text-sm text-muted-foreground">No students have overdue fees.</p>
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
                      className="underline-offset-4 hover:underline"
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
                  <TableCell className="text-right">{formatMoney(s.overdueAmount)}</TableCell>
                  <TableCell className="text-right">{s.daysOverdue}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

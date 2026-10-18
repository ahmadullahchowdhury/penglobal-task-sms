import { CalendarClock, CircleCheck, Receipt, TriangleAlert, Wallet } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { LocalTime } from "@/components/local-time";
import { RecordPaymentDialog } from "@/components/record-payment-dialog";
import { ReversePaymentDialog } from "@/components/reverse-payment-dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import type { getFees } from "@/lib/services/fees";
import { cn } from "@/lib/utils";

type Fees = Awaited<ReturnType<typeof getFees>>;

// Shared by the staff Fees tab and the student's own fees page. Only the staff
// view passes canManage, and the API enforces that again on every write.
export function FeesView({ fees, canManage }: { fees: Fees; canManage: boolean }) {
  const { balance, overdue, charges, payments, student } = fees;
  const paidUp = balance === 0;

  return (
    <div className="space-y-8">
      <div className="surface flex flex-wrap items-center justify-between gap-4 p-5">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "grid size-12 place-items-center rounded-xl",
              paidUp ? "bg-success/12 text-success" : "bg-info/12 text-info",
            )}
          >
            {paidUp ? <CircleCheck className="size-6" /> : <Wallet className="size-6" />}
          </span>
          <div>
            <p className="text-sm text-muted-foreground">Outstanding balance</p>
            <p className="text-3xl font-bold leading-tight tabular-nums">{formatMoney(balance)}</p>
            {paidUp && <p className="text-sm text-success">Paid in full</p>}
          </div>
        </div>
        {canManage && balance > 0 && (
          <RecordPaymentDialog studentId={student.id} outstandingLabel={formatMoney(balance)} />
        )}
      </div>

      {overdue.overdueAmount > 0 && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/8 px-4 py-3.5 text-destructive"
        >
          <TriangleAlert className="mt-0.5 size-5 shrink-0" />
          <p className="text-sm">
            <span className="font-semibold">{formatMoney(overdue.overdueAmount)} is overdue</span>{" "}
            by {overdue.daysOverdue} {overdue.daysOverdue === 1 ? "day" : "days"}.
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg">
          <CalendarClock className="size-5 text-muted-foreground" />
          Charges
        </h2>
        {charges.length === 0 ? (
          <EmptyState icon={CalendarClock} title="No charges" description="Nothing has been charged yet." />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Due</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {charges.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.description}</TableCell>
                  <TableCell>
                    <LocalTime iso={c.dueDate.toISOString()} dateOnly />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(c.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-lg">
          <Receipt className="size-5 text-muted-foreground" />
          Payments
        </h2>
        {payments.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No payments yet"
            description={canManage ? "Record a payment when one arrives." : "Payments appear here once recorded."}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Note</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                {canManage && <TableHead />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id} className={cn(p.isReversed && "text-muted-foreground")}>
                  <TableCell>
                    <LocalTime iso={p.paidAt.toISOString()} />
                  </TableCell>
                  <TableCell className="space-x-1.5">
                    <span className={cn("font-mono text-[0.8rem]", p.isReversed && "line-through")}>
                      {p.reference}
                    </span>
                    {p.kind === "REVERSAL" && <Badge variant="warning">Reversal</Badge>}
                    {p.isReversed && <Badge variant="neutral">Reversed</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.note}</TableCell>
                  <TableCell
                    className={cn(
                      "text-right font-medium tabular-nums",
                      p.amount < 0 && "text-destructive",
                    )}
                  >
                    {formatMoney(p.amount)}
                  </TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      {p.kind === "PAYMENT" && !p.isReversed && (
                        <ReversePaymentDialog
                          paymentId={p.id}
                          summary={`${formatMoney(p.amount)}, reference ${p.reference}`}
                        />
                      )}
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
}

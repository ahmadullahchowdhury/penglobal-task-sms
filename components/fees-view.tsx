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
import { LocalTime } from "@/components/local-time";
import { formatMoney } from "@/lib/money";
import type { getFees } from "@/lib/services/fees";

type Fees = Awaited<ReturnType<typeof getFees>>;

// Shared by the staff Fees tab and the student's own fees page. Only the staff
// view passes canManage, and the API enforces that again on every write.
export function FeesView({ fees, canManage }: { fees: Fees; canManage: boolean }) {
  const { balance, overdue, charges, payments, student } = fees;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Outstanding balance</p>
          <p className="text-3xl font-semibold">{formatMoney(balance)}</p>
        </div>
        {canManage && balance > 0 && (
          <RecordPaymentDialog studentId={student.id} outstandingLabel={formatMoney(balance)} />
        )}
      </div>

      {overdue.overdueAmount > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <p className="font-medium">
            {formatMoney(overdue.overdueAmount)} is overdue by {overdue.daysOverdue}{" "}
            {overdue.daysOverdue === 1 ? "day" : "days"}
          </p>
        </div>
      )}

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Charges</h2>
        {charges.length === 0 ? (
          <p className="text-sm text-muted-foreground">No charges.</p>
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
                  <TableCell>{c.description}</TableCell>
                  <TableCell>
                    <LocalTime iso={c.dueDate.toISOString()} dateOnly />
                  </TableCell>
                  <TableCell className="text-right">{formatMoney(c.amount)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Payments</h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground">No payments recorded yet.</p>
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
                <TableRow key={p.id}>
                  <TableCell>
                    <LocalTime iso={p.paidAt.toISOString()} />
                  </TableCell>
                  <TableCell className="font-mono">
                    {p.reference}{" "}
                    {p.kind === "REVERSAL" && <Badge variant="outline">Reversal</Badge>}
                    {p.isReversed && <Badge variant="secondary">Reversed</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.note}</TableCell>
                  <TableCell className="text-right">{formatMoney(p.amount)}</TableCell>
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

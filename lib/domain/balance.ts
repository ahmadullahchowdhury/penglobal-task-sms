const MS_PER_DAY = 24 * 60 * 60 * 1000;

export type ChargeLike = { amount: number; dueDate: Date };
// Signed: PAYMENT rows are positive, REVERSAL rows are negative.
export type PaymentLike = { amount: number };

const sum = (items: { amount: number }[]) => items.reduce((t, i) => t + i.amount, 0);

// Charges minus net payments (reversals already subtract). Never stored.
export function computeBalance(charges: ChargeLike[], payments: PaymentLike[]): number {
  return sum(charges) - sum(payments);
}

// A payment that would take the balance below zero would be a hidden credit.
export function exceedsBalance(balance: number, amount: number): boolean {
  return amount > balance;
}

// Payments are applied to the oldest charge first. A charge is overdue once its due
// date has passed (a charge due exactly now is not yet overdue) and any of it is
// still uncovered. Days overdue are counted from the oldest uncovered due date and
// rounded up, so anything overdue is at least one day.
export function computeOverdue(
  charges: ChargeLike[],
  payments: PaymentLike[],
  now: Date,
): { overdueAmount: number; daysOverdue: number } {
  let unapplied = Math.max(0, sum(payments));
  let overdueAmount = 0;
  let oldestUncovered: Date | null = null;

  const oldestFirst = [...charges].sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  for (const charge of oldestFirst) {
    const covered = Math.min(charge.amount, unapplied);
    unapplied -= covered;
    const remaining = charge.amount - covered;

    if (remaining > 0 && charge.dueDate.getTime() < now.getTime()) {
      overdueAmount += remaining;
      oldestUncovered ??= charge.dueDate;
    }
  }

  if (!oldestUncovered) return { overdueAmount: 0, daysOverdue: 0 };
  const daysOverdue = Math.ceil((now.getTime() - oldestUncovered.getTime()) / MS_PER_DAY);
  return { overdueAmount, daysOverdue };
}

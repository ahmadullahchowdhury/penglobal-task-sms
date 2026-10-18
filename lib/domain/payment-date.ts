const DAY = 86_400_000;
const EARLIEST = Date.UTC(2000, 0, 1);

const utcMidnight = (d: Date) => Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
const parse = (paidOn: string) => Date.parse(`${paidOn}T00:00:00.000Z`);

// The date a payment was received, as YYYY-MM-DD. It cannot be in the future. One
// day of slack is allowed because "today" for someone ahead of UTC can already be
// tomorrow in UTC.
export function isAcceptablePaymentDate(paidOn: string, now: Date): boolean {
  const t = parse(paidOn);
  if (Number.isNaN(t)) return false;
  return t >= EARLIEST && t <= utcMidnight(now) + DAY;
}

// When to record the payment as received. No date, or today, means right now. An
// earlier day is recorded at midday UTC on that day, so it sorts sensibly and does
// not slip across a date boundary in any timezone.
export function paymentDateFor(paidOn: string | undefined, now: Date): Date {
  if (!paidOn) return now;
  const t = parse(paidOn);
  if (t >= utcMidnight(now)) return now;
  return new Date(t + DAY / 2);
}

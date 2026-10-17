const MS_PER_DAY = 24 * 60 * 60 * 1000;

// Due date for a charge created at `from`: that moment plus the programme's due days.
export function feeDueDate(from: Date, feeDueDays: number): Date {
  return new Date(from.getTime() + feeDueDays * MS_PER_DAY);
}

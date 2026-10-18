// Dates are formatted in UTC so server and browser render the same text.
const dateFormat = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });
const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export const formatDate = (d: Date) => dateFormat.format(d);
export const formatDateTime = (d: Date) => `${dateTimeFormat.format(d)} UTC`;

// Academic year is stored as its starting year: 2025 -> "2025/26".
export function academicYearLabel(year: number): string {
  return `${year}/${String((year + 1) % 100).padStart(2, "0")}`;
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

// The two largest non-zero units: "2 days 3 hours", "45 minutes".
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms));
  if (total < MINUTE) return "less than a minute";
  const parts = [
    [Math.floor(total / DAY), "day"],
    [Math.floor((total % DAY) / HOUR), "hour"],
    [Math.floor((total % HOUR) / MINUTE), "minute"],
  ] as const;
  return parts
    .filter(([n]) => n > 0)
    .slice(0, 2)
    .map(([n, unit]) => `${n} ${unit}${n === 1 ? "" : "s"}`)
    .join(" ");
}

// A countdown before the deadline, an overdue note after it.
export function describeDeadline(deadline: Date, now: Date): { overdue: boolean; text: string } {
  const diff = deadline.getTime() - now.getTime();
  return diff >= 0
    ? { overdue: false, text: `Due in ${formatDuration(diff)}` }
    : { overdue: true, text: `Deadline passed ${formatDuration(-diff)} ago` };
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

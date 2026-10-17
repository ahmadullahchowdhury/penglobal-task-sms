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

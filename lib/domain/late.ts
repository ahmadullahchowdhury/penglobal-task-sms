// Compared as instants (UTC). Submitting exactly at the deadline is on time.
export function isLateSubmission(submittedAt: Date, deadline: Date): boolean {
  return submittedAt.getTime() > deadline.getTime();
}

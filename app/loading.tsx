// Shown while a page streams in. Placeholders mirror the real layout (a title,
// a few stat cards and a table) so the page does not jump when it arrives.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-8 animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="h-4 w-96 max-w-full rounded bg-muted/70" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <div key={i} className="surface h-24" />
        ))}
      </div>
      <div className="surface h-64" />
    </div>
  );
}

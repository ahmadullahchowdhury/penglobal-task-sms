// Shown while a page streams in. Light placeholders keep the layout from jumping.
export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="space-y-6 animate-pulse">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-56 rounded-lg bg-muted" />
      <div className="space-y-3">
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
        <div className="h-10 rounded-lg bg-muted" />
      </div>
    </div>
  );
}

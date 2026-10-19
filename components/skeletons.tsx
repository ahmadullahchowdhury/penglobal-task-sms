// Placeholders shown while one section of a page loads, so the rest of the page
// stays put. They mirror the real layout to avoid jumping when the data arrives.

function Region({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="status" aria-live="polite" className="animate-pulse">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Region label="Loading…">
      <div className="surface divide-y divide-border">
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-3.5">
            <div className="h-4 w-28 rounded bg-muted" />
            <div className="h-4 flex-1 rounded bg-muted/70" />
            <div className="h-4 w-20 rounded bg-muted" />
          </div>
        ))}
      </div>
    </Region>
  );
}

export function PanelSkeleton() {
  return (
    <Region label="Loading…">
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="surface h-24" />
          ))}
        </div>
        <div className="surface h-56" />
      </div>
    </Region>
  );
}

export function HeaderSkeleton() {
  return (
    <Region label="Loading…">
      <div className="space-y-2">
        <div className="h-8 w-64 rounded-lg bg-muted" />
        <div className="h-4 w-32 rounded bg-muted/70" />
      </div>
    </Region>
  );
}

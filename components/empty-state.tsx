import type { LucideIcon } from "lucide-react";

// An empty list is a prompt to act, so it says what is missing and what to do.
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-input bg-card/60 px-6 py-12 text-center">
      <span className="grid size-11 place-items-center rounded-full bg-accent text-accent-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const TONES = {
  neutral: "bg-accent text-accent-foreground",
  info: "bg-info/12 text-info",
  warning: "bg-warning/18 text-[oklch(0.5_0.12_65)]",
  danger: "bg-destructive/10 text-destructive",
  success: "bg-success/12 text-success",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
  hint,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: keyof typeof TONES;
  hint?: string;
}) {
  return (
    <div className="surface flex items-start gap-4 p-5">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", TONES[tone])}>
        <Icon className="size-5" />
      </span>
      <div className="min-w-0 space-y-0.5">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-heading text-3xl leading-none tracking-tight tabular-nums">{value}</p>
        {hint && <p className="pt-1 text-xs text-muted-foreground">{hint}</p>}
      </div>
    </div>
  );
}

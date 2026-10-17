import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { statusLabel } from "@/lib/domain/status";
import { Badge } from "@/components/ui/badge";

const VARIANTS = {
  ENROLLED: "default",
  DEFERRED: "secondary",
  WITHDRAWN: "destructive",
  COMPLETED: "outline",
} as const;

export function StatusBadge({ status }: { status: EnrolmentStatus }) {
  return <Badge variant={VARIANTS[status]}>{statusLabel(status)}</Badge>;
}

import { CircleCheck, GraduationCap, LogOut, Pause } from "lucide-react";
import type { EnrolmentStatus } from "@/generated/prisma/enums";
import { statusLabel } from "@/lib/domain/status";
import { Badge } from "@/components/ui/badge";

const STYLE = {
  ENROLLED: { variant: "success", Icon: CircleCheck },
  DEFERRED: { variant: "warning", Icon: Pause },
  WITHDRAWN: { variant: "destructive", Icon: LogOut },
  COMPLETED: { variant: "info", Icon: GraduationCap },
} as const;

export function StatusBadge({ status }: { status: EnrolmentStatus }) {
  const { variant, Icon } = STYLE[status];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {statusLabel(status)}
    </Badge>
  );
}

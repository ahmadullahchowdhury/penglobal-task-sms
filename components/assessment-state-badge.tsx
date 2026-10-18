import { CircleDot, Lock, PencilLine } from "lucide-react";
import type { AssessmentState } from "@/generated/prisma/enums";
import { assessmentStateLabel } from "@/lib/domain/assessment";
import { Badge } from "@/components/ui/badge";

const STYLE = {
  DRAFT: { variant: "neutral", Icon: PencilLine },
  OPEN: { variant: "success", Icon: CircleDot },
  CLOSED: { variant: "info", Icon: Lock },
} as const;

export function AssessmentStateBadge({ state }: { state: AssessmentState }) {
  const { variant, Icon } = STYLE[state];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {assessmentStateLabel(state)}
    </Badge>
  );
}

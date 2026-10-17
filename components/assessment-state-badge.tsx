import type { AssessmentState } from "@/generated/prisma/enums";
import { assessmentStateLabel } from "@/lib/domain/assessment";
import { Badge } from "@/components/ui/badge";

const VARIANTS = {
  DRAFT: "secondary",
  OPEN: "default",
  CLOSED: "outline",
} as const;

export function AssessmentStateBadge({ state }: { state: AssessmentState }) {
  return <Badge variant={VARIANTS[state]}>{assessmentStateLabel(state)}</Badge>;
}

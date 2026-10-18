import { CircleCheck, Clock, Hourglass } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_PROGRESS_LABELS,
  type SubmissionProgress,
} from "@/lib/domain/submission";

const STYLE = {
  NOT_SUBMITTED: { variant: "neutral", Icon: Hourglass },
  SUBMITTED: { variant: "success", Icon: CircleCheck },
  SUBMITTED_LATE: { variant: "destructive", Icon: Clock },
} as const;

export function SubmissionProgressBadge({ progress }: { progress: SubmissionProgress }) {
  const { variant, Icon } = STYLE[progress];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {SUBMISSION_PROGRESS_LABELS[progress]}
    </Badge>
  );
}

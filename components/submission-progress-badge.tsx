import { Badge } from "@/components/ui/badge";
import {
  SUBMISSION_PROGRESS_LABELS,
  type SubmissionProgress,
} from "@/lib/domain/submission";

const VARIANTS = {
  NOT_SUBMITTED: "outline",
  SUBMITTED: "default",
  SUBMITTED_LATE: "destructive",
} as const;

export function SubmissionProgressBadge({ progress }: { progress: SubmissionProgress }) {
  return <Badge variant={VARIANTS[progress]}>{SUBMISSION_PROGRESS_LABELS[progress]}</Badge>;
}

import { Award, CircleX, Medal, ThumbsUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Classification } from "@/lib/domain/classification";

const STYLE = {
  Distinction: { variant: "info", Icon: Award },
  Merit: { variant: "success", Icon: Medal },
  Pass: { variant: "neutral", Icon: ThumbsUp },
  Fail: { variant: "destructive", Icon: CircleX },
} as const;

export function ClassificationBadge({ classification }: { classification: Classification }) {
  const { variant, Icon } = STYLE[classification];
  return (
    <Badge variant={variant}>
      <Icon data-icon="inline-start" />
      {classification}
    </Badge>
  );
}

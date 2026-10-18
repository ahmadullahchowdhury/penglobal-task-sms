import { Badge } from "@/components/ui/badge";
import type { Classification } from "@/lib/domain/classification";

const VARIANTS = {
  Distinction: "default",
  Merit: "secondary",
  Pass: "outline",
  Fail: "destructive",
} as const;

export function ClassificationBadge({ classification }: { classification: Classification }) {
  return <Badge variant={VARIANTS[classification]}>{classification}</Badge>;
}

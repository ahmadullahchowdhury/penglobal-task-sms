import { requirePageRole } from "@/lib/auth";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";

export default async function StudentLayout({ children }: LayoutProps<"/student">) {
  await requirePageRole(...STUDENT_AREA_ROLES);
  return children;
}

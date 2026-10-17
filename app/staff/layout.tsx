import { requirePageRole } from "@/lib/auth";
import { STAFF_AREA_ROLES } from "@/lib/domain/roles";

export default async function StaffLayout({ children }: LayoutProps<"/staff">) {
  await requirePageRole(...STAFF_AREA_ROLES);
  return children;
}

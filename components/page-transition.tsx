"use client";

import { usePathname } from "next/navigation";

// Re-keying on the path replays the short fade-in each time you move to another
// page. Changing a filter or tab on the same page does not replay it.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-in">
      {children}
    </div>
  );
}

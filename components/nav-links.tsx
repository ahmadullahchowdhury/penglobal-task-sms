"use client";

import {
  ClipboardList,
  GraduationCap,
  LayoutDashboard,
  Trophy,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  students: Users,
  assessments: ClipboardList,
  results: Trophy,
  fees: Wallet,
  home: GraduationCap,
} satisfies Record<string, LucideIcon>;

// exact: highlight only on this page, not on the pages under it (for a home link).
export type NavItem = { href: string; label: string; icon: keyof typeof ICONS; exact?: boolean };

// The link for the page you are on is highlighted, including its child pages.
// Stacked in the sidebar on wide screens, wrapping in a row on narrow ones.
export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Main"
      className="flex flex-row flex-wrap gap-1 md:flex-col md:flex-nowrap"
    >
      {items.map(({ href, label, icon, exact }) => {
        const Icon = ICONS[icon];
        const active =
          pathname === href || (!exact && href !== "/" && pathname.startsWith(`${href}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-white/70 transition-colors hover:bg-white/10 hover:text-white",
              active && "bg-white/12 text-white",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "absolute inset-y-2 left-0 hidden w-0.75 origin-center rounded-full bg-white transition-transform duration-200 md:block",
                active ? "scale-y-100" : "scale-y-0",
              )}
            />
            <Icon className="size-[1.1rem] shrink-0 transition-transform group-hover:scale-110" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

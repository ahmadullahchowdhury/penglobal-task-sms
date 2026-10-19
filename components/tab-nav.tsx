"use client";

import { Loader2, UserRound, Wallet, type LucideIcon } from "lucide-react";
import Link, { useLinkStatus } from "next/link";
import { cn } from "@/lib/utils";

const ICON_CLASS = "size-4";

// Icons are passed by name: a component cannot cross from a server page into this client one.
const ICONS = { details: UserRound, fees: Wallet } satisfies Record<string, LucideIcon>;

// Swaps the tab's icon for a spinner while its navigation is in flight, so a
// click gives feedback even before the server has answered.
function TabIcon({ icon }: { icon: keyof typeof ICONS }) {
  const { pending } = useLinkStatus();
  const Icon = ICONS[icon];
  return pending ? (
    <Loader2 aria-hidden className={cn(ICON_CLASS, "animate-spin")} />
  ) : (
    <Icon aria-hidden className={ICON_CLASS} />
  );
}

export type Tab = { key: string; label: string; href: string; icon: keyof typeof ICONS };

export function TabNav({ tabs, active }: { tabs: readonly Tab[]; active: string }) {
  return (
    <nav className="flex gap-1 border-b border-border">
      {tabs.map(({ key, label, href, icon }) => (
        <Link
          key={key}
          href={href}
          aria-current={active === key ? "page" : undefined}
          className={cn(
            "-mb-px flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
            active === key
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:border-input hover:text-foreground",
          )}
        >
          <TabIcon icon={icon} />
          {label}
        </Link>
      ))}
    </nav>
  );
}

"use client";

import { ChevronsUpDown, Loader2, Repeat2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

type SwitcherUser = { id: string; name: string; roleLabel: string };

export function RoleSwitcher({
  users,
  currentUserId,
}: {
  users: SwitcherUser[];
  currentUserId: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  async function onChange(userId: string) {
    setError(null);
    const res = await fetch("/api/dev/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      setError((await res.json()).error?.message ?? "Could not switch user");
      return;
    }
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  return (
    <label className="flex items-center gap-2 text-sm">
      <span className="text-muted-foreground">Viewing as</span>
      <span className="relative block">
        {pending ? (
          <Loader2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : (
          <Repeat2 className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        )}
        <select
          className="h-10 w-60 cursor-pointer appearance-none rounded-lg border border-input bg-card pl-8 pr-8 text-sm shadow-xs outline-none transition-colors hover:bg-accent focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-70"
          value={currentUserId ?? ""}
          disabled={pending}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="" disabled>
            Select a user
          </option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.roleLabel})
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      </span>
      {error && <span className="text-xs text-destructive">{error}</span>}
    </label>
  );
}

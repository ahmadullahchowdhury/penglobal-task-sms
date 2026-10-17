"use client";

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
      <select
        className="h-8 rounded-lg border border-border bg-background px-2 text-sm"
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
      {error && <span className="text-destructive">{error}</span>}
    </label>
  );
}

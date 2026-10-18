"use client";

import { ChevronRight, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";

type PickerUser = { id: string; name: string; roleLabel: string; role: string };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

// The demo's way in: choose who to view the app as. It calls the same endpoint as
// the "Viewing as" menu in the header.
export function RolePicker({ users }: { users: PickerUser[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [choosing, setChoosing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function choose(userId: string) {
    setError(null);
    setChoosing(userId);
    const res = await fetch("/api/dev/switch-role", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) {
      setError((await res.json()).error?.message ?? "Could not switch user");
      setChoosing(null);
      return;
    }
    startTransition(() => {
      router.push("/");
      router.refresh();
    });
  }

  const groups = [
    { title: "Registry and staff", users: users.filter((u) => u.role !== "STUDENT") },
    { title: "Students", users: users.filter((u) => u.role === "STUDENT") },
  ].filter((g) => g.users.length > 0);

  return (
    <div className="space-y-8">
      {groups.map((group) => (
        <section key={group.title} className="space-y-3">
          <h2 className="text-lg">{group.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.users.map((u) => {
              const busy = choosing === u.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={pending || choosing !== null}
                  onClick={() => choose(u.id)}
                  className="surface group flex items-center gap-3 p-3.5 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-ring/50 hover:shadow-lift focus-visible:outline-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-60"
                >
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                    {initials(u.name)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{u.name}</span>
                    <Badge variant="neutral" className="mt-1">
                      {u.roleLabel}
                    </Badge>
                  </span>
                  {busy ? (
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  ) : (
                    <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  )}
                </button>
              );
            })}
          </div>
        </section>
      ))}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

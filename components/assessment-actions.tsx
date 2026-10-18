"use client";

import { Lock, Play } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { AssessmentState } from "@/generated/prisma/enums";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Action = { to: AssessmentState; label: string; confirm?: string };

// The server decides which actions are legal for the current state; this only
// sends the change and shows whatever the API says if it is refused.
export function AssessmentActions({ id, actions }: { id: string; actions: Action[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<Action["to"] | null>(null);

  async function apply(to: Action["to"]) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/assessments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: to }),
      });
      if (res.ok) {
        setConfirming(null);
        router.refresh();
        return;
      }
      setError((await res.json()).error?.message ?? "Could not change the state");
      setConfirming(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        {actions.map((a) =>
          a.confirm ? (
            <Dialog
              key={a.to}
              open={confirming === a.to}
              onOpenChange={(open) => setConfirming(open ? a.to : null)}
            >
              <DialogTrigger render={<Button variant="outline" size="sm" />}>
                <Lock className="size-3.5" />
                {a.label}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{a.label} this assessment?</DialogTitle>
                  <DialogDescription>{a.confirm}</DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button variant="destructive" disabled={busy} onClick={() => apply(a.to)}>
                    {busy ? "Saving…" : a.label}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          ) : (
            <Button key={a.to} size="sm" disabled={busy} onClick={() => apply(a.to)}>
              <Play className="size-3.5" />
              {a.label}
            </Button>
          ),
        )}
      </div>
      {error && (
        <p role="alert" className="max-w-64 text-right text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}

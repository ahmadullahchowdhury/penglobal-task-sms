"use client";

import { Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ReversePaymentDialog({
  paymentId,
  summary,
}: {
  paymentId: string;
  summary: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setReason("");
      setError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/payments/${paymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      const body = await res.json();
      setError(body.error?.fields?.reason?.[0] ?? body.error?.message ?? "Could not reverse");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="ghost" size="sm" />}>
        <Undo2 className="size-3.5" />
        Reverse
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Reverse this payment?</DialogTitle>
            <DialogDescription>
              {summary}. This adds a matching negative entry and puts the amount back on the
              student&apos;s balance. The original stays in the history and this cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="reverse-reason">Reason</Label>
            <Textarea
              id="reverse-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!error}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? "Reversing…" : "Reverse payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

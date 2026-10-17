"use client";

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
import { NativeSelect } from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";

type Option = { value: string; label: string; reasonRequired: boolean };

// The server decides which targets are legal and which need a reason; this
// component only renders that list and reports API errors.
export function StatusChangeDialog({
  studentId,
  options,
}: {
  studentId: string;
  options: Option[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [toStatus, setToStatus] = useState(options[0]?.value ?? "");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [reasonError, setReasonError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = options.find((o) => o.value === toStatus);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setToStatus(options[0]?.value ?? "");
      setReason("");
      setError(null);
      setReasonError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setReasonError(null);
    try {
      const res = await fetch(`/api/students/${studentId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toStatus, reason }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      const body = await res.json();
      const fieldReason: string | undefined = body.error?.fields?.reason?.[0];
      if (fieldReason) setReasonError(fieldReason);
      else setError(body.error?.message ?? "Could not change the status");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button variant="outline" />}>Change status</DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4">
          <DialogHeader>
            <DialogTitle>Change status</DialogTitle>
            <DialogDescription>
              The change is recorded in the student&apos;s history.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="toStatus">New status</Label>
            <NativeSelect
              id="toStatus"
              value={toStatus}
              onChange={(e) => setToStatus(e.target.value)}
            >
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reason">
              Reason{selected?.reasonRequired ? " (required)" : " (optional)"}
            </Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              aria-invalid={!!reasonError}
            />
            {reasonError && <p className="text-sm text-destructive">{reasonError}</p>}
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

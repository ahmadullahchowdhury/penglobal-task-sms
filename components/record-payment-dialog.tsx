"use client";

import { Banknote } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseMoneyToMinor } from "@/lib/money";

// Today in the viewer's own timezone, as YYYY-MM-DD (the format a date input uses).
const today = () => new Date().toLocaleDateString("en-CA");

export function RecordPaymentDialog({
  studentId,
  outstandingLabel,
}: {
  studentId: string;
  outstandingLabel: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [paidOn, setPaidOn] = useState(today());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function onOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setAmount("");
      setReference("");
      setPaidOn(today());
      setNote("");
      setErrors({});
      setFormError(null);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const minor = parseMoneyToMinor(amount);
    if (minor === null || minor <= 0) {
      setErrors({ amount: "Enter an amount greater than zero, like 250 or 99.50" });
      return;
    }
    setErrors({});

    setBusy(true);
    try {
      const res = await fetch(`/api/students/${studentId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: minor, reference, paidOn: paidOn || undefined, note }),
      });
      if (res.ok) {
        setOpen(false);
        router.refresh();
        return;
      }
      const body = await res.json();
      const fields: Record<string, string[]> = body.error?.fields ?? {};
      const fieldErrors = Object.fromEntries(
        Object.entries(fields).map(([k, v]) => [k, v[0]]),
      );
      setErrors(fieldErrors);
      if (Object.keys(fieldErrors).length === 0) {
        setFormError(body.error?.message ?? "Could not record the payment");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={<Button />}>
        <Banknote className="size-4" />
        Record payment
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={submit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Record payment</DialogTitle>
            <DialogDescription>Outstanding balance: {outstandingLabel}</DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount (£)</Label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              aria-invalid={!!errors.amount}
            />
            {errors.amount && <p className="text-sm text-destructive">{errors.amount}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="reference">Bank or receipt reference</Label>
            <Input
              id="reference"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              aria-invalid={!!errors.reference}
            />
            {errors.reference && <p className="text-sm text-destructive">{errors.reference}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="paidOn">Date received</Label>
            <Input
              id="paidOn"
              type="date"
              value={paidOn}
              max={today()}
              onChange={(e) => setPaidOn(e.target.value)}
              aria-invalid={!!errors.paidOn}
            />
            {errors.paidOn && <p className="text-sm text-destructive">{errors.paidOn}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="note">Note (optional)</Label>
            <Input id="note" value={note} onChange={(e) => setNote(e.target.value)} />
          </div>

          {formError && (
            <p role="alert" className="text-sm text-destructive">
              {formError}
            </p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={busy}>
              {busy ? "Saving…" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { Clock, Download, Eye, EyeOff, Hourglass, Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClassificationBadge } from "@/components/classification-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { TableCell, TableRow } from "@/components/ui/table";
import { classify } from "@/lib/domain/classification";
import { parseScoreInput } from "@/lib/domain/grade";

type Props = {
  assessmentId: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  isLate: boolean;
  fileName: string;
  submissionId: string;
  grade: { score: number; isPublished: boolean } | null;
};

export function MarksheetRow(p: Props) {
  const router = useRouter();
  const [value, setValue] = useState(p.grade ? String(p.grade.score) : "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const typed = parseScoreInput(value);
  const invalid = value.trim() !== "" && typed === null;
  const dirty = typed !== null && typed !== p.grade?.score;
  const base = `/api/assessments/${p.assessmentId}/grades/${p.studentId}`;

  async function call(url: string, init: RequestInit) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(url, init);
      if (res.ok) {
        setConfirming(false);
        router.refresh();
        return;
      }
      const body = await res.json();
      setError(body.error?.fields?.score?.[0] ?? body.error?.message ?? "Something went wrong");
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  }

  const save = () =>
    call(base, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ score: typed }),
    });

  function onSave() {
    // Changing a published grade withholds it again, so ask first.
    if (p.grade?.isPublished) setConfirming(true);
    else void save();
  }

  return (
    <TableRow>
      <TableCell>
        {p.studentName}{" "}
        <span className="font-mono text-xs text-muted-foreground">{p.studentNumber}</span>
      </TableCell>
      <TableCell>
        <a
          href={`/api/submissions/${p.submissionId}/file`}
          className="inline-flex items-center gap-1.5 font-medium text-info underline-offset-4 hover:underline"
        >
          <Download className="size-3.5" />
          {p.fileName}
        </a>{" "}
        {p.isLate && (
          <Badge variant="destructive">
            <Clock data-icon="inline-start" />
            Late
          </Badge>
        )}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Input
            inputMode="numeric"
            aria-label={`Score for ${p.studentName}`}
            aria-invalid={invalid}
            className="w-20"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            disabled={busy}
          />
          <Button size="sm" disabled={!dirty || busy} onClick={onSave}>
            <Save className="size-3.5" />
            Save
          </Button>
        </div>
        {invalid && <p className="mt-1 text-xs text-destructive">Whole number from 0 to 100</p>}
        {error && (
          <p role="alert" className="mt-1 text-xs text-destructive">
            {error}
          </p>
        )}
      </TableCell>
      <TableCell>{typed !== null && <ClassificationBadge classification={classify(typed)} />}</TableCell>
      <TableCell>
        {!p.grade ? (
          <Badge variant="neutral">
            <Hourglass data-icon="inline-start" />
            Not graded
          </Badge>
        ) : p.grade.isPublished ? (
          <Badge variant="success">
            <Eye data-icon="inline-start" />
            Published
          </Badge>
        ) : (
          <Badge variant="warning">
            <EyeOff data-icon="inline-start" />
            Withheld
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-right">
        {p.grade && (
          <Button
            variant="outline"
            size="sm"
            disabled={dirty || busy}
            onClick={() =>
              call(`${base}/${p.grade!.isPublished ? "withhold" : "publish"}`, { method: "POST" })
            }
          >
            {p.grade.isPublished ? "Withhold" : "Publish"}
          </Button>
        )}
      </TableCell>

      <Dialog open={confirming} onOpenChange={setConfirming}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change a published grade?</DialogTitle>
            <DialogDescription>
              {p.studentName}&apos;s grade is published. Changing it will withhold it again, so the
              student stops seeing it until you publish it. The previous score is kept in the audit
              log.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button disabled={busy} onClick={save}>
              {busy ? "Saving…" : "Change and withhold"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TableRow>
  );
}

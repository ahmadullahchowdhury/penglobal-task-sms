"use client";

import { Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MAX_UPLOAD_BYTES } from "@/lib/constants";

// Quick checks for a friendlier message. The server repeats every one of them
// (extension, MIME type, size and file signature) and is what actually enforces them.
function preCheck(file: File): string | null {
  if (!/\.(pdf|docx)$/i.test(file.name)) return "Only PDF and DOCX files can be uploaded";
  if (file.size === 0) return "The file is empty";
  if (file.size > MAX_UPLOAD_BYTES) return "The file is larger than the 10 MB limit";
  return null;
}

export function SubmissionUpload({
  assessmentId,
  label,
}: {
  assessmentId: string;
  label: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const file = input.current?.files?.[0];
    if (!file) {
      setError("Choose a file first");
      return;
    }
    const problem = preCheck(file);
    if (problem) {
      setError(problem);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch(`/api/assessments/${assessmentId}/submissions`, {
        method: "POST",
        body,
      });
      if (res.ok) {
        if (input.current) input.current.value = "";
        router.refresh();
        return;
      }
      setError((await res.json()).error?.message ?? "Could not upload the file");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-wrap items-center gap-3">
      <input
        ref={input}
        type="file"
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        aria-label="File to upload"
        className="min-w-0 flex-1 cursor-pointer text-sm file:mr-3 file:cursor-pointer file:rounded-lg file:border file:border-input file:bg-card file:px-3 file:py-1.5 file:text-sm file:font-medium file:transition-colors hover:file:bg-accent"
      />
      <Button type="submit" size="sm" disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
        {busy ? "Uploading…" : label}
      </Button>
      {error && (
        <p role="alert" className="w-full text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

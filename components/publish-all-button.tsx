"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PublishAllButton({ assessmentId, pending }: { assessmentId: string; pending: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/assessments/${assessmentId}/grades/publish-all`, {
        method: "POST",
      });
      const body = await res.json();
      if (!res.ok) {
        setMessage(body.error?.message ?? "Could not publish");
        return;
      }
      setMessage(
        body.published === 0
          ? "Nothing to publish"
          : `Published ${body.published} ${body.published === 1 ? "grade" : "grades"}`,
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <Button onClick={run} disabled={busy || pending === 0}>
        {busy ? "Publishing…" : "Publish all graded"}
      </Button>
      {message && (
        <span role="status" className="text-sm text-muted-foreground">
          {message}
        </span>
      )}
    </div>
  );
}

"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Last-resort fallback for an unexpected failure while rendering a page. It shows a
// plain message and never the error itself, which could contain internal details.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-destructive/10 text-destructive">
        <TriangleAlert className="size-7" />
      </span>
      <h1 className="text-3xl">Something went wrong</h1>
      <p className="text-muted-foreground">
        The page could not be loaded. Try again, and if it keeps happening let the Registry know.
      </p>
      <Button onClick={() => retry()}>
        <RotateCcw className="size-4" />
        Try again
      </Button>
    </div>
  );
}

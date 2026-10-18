"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

// Last-resort fallback for an unexpected failure while rendering a page. It shows a
// plain message and never the error itself, which could contain internal details.
export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground">
        The page could not be loaded. Try again, and if it keeps happening let the Registry know.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </div>
  );
}

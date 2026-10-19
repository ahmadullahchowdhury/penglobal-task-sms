"use client";

import { Loader2, Search } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";

// Must sit inside a next/form <Form>. Shows a spinner while the results load.
export function SearchButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="h-9" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
      {children}
    </Button>
  );
}

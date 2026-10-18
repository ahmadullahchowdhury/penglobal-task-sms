import { Compass } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-accent text-accent-foreground">
        <Compass className="size-7" />
      </span>
      <h1 className="text-3xl">Not found</h1>
      <p className="text-muted-foreground">
        This page does not exist, or you do not have access to it.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to the start
      </Link>
    </div>
  );
}

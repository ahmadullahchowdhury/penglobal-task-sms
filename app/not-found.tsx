import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">Not found</h1>
      <p className="text-muted-foreground">
        This page does not exist, or you do not have access to it.
      </p>
      <Link href="/" className={buttonVariants()}>
        Back to the start
      </Link>
    </div>
  );
}

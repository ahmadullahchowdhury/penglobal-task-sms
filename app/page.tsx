import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homePathFor } from "@/lib/domain/roles";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect(homePathFor(user.role));

  return (
    <div className="space-y-2">
      <h1 className="text-2xl font-semibold">Welcome</h1>
      <p className="text-muted-foreground">
        {process.env.DEMO_ROLE_SWITCHER === "true"
          ? 'Pick a user in the "Viewing as" menu to continue.'
          : "Sign in to continue."}
      </p>
    </div>
  );
}

import { ChevronRight, ClipboardList, Trophy, Wallet } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/page-header";
import { requirePageRole } from "@/lib/auth";
import { STUDENT_AREA_ROLES } from "@/lib/domain/roles";

const LINKS = [
  {
    href: "/student/assessments",
    Icon: ClipboardList,
    title: "Assessments",
    text: "See what is due and upload your work.",
  },
  {
    href: "/student/results",
    Icon: Trophy,
    title: "Results",
    text: "Read the marks that have been published.",
  },
  {
    href: "/student/fees",
    Icon: Wallet,
    title: "Fees",
    text: "Check your balance and payment history.",
  },
] as const;

export default async function StudentHome() {
  const user = await requirePageRole(...STUDENT_AREA_ROLES);

  return (
    <div className="space-y-8">
      <PageHeader title={`Welcome, ${user.name.split(" ")[0]}`} description="Everything for your studies in one place." />
      <div className="grid gap-4 sm:grid-cols-3">
        {LINKS.map(({ href, Icon, title, text }) => (
          <Link
            key={href}
            href={href}
            className="surface group flex flex-col gap-3 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift"
          >
            <span className="grid size-10 place-items-center rounded-lg bg-accent text-accent-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <Icon className="size-5" />
            </span>
            <span className="space-y-1">
              <span className="flex items-center justify-between font-semibold">
                {title}
                <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </span>
              <span className="block text-sm text-muted-foreground">{text}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

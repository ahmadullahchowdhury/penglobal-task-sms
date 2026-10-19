import { ChevronLeft, ChevronRight, Plus, Search, UserPlus, Users, X } from "lucide-react";
import Form from "next/form";
import Link from "next/link";
import { EmptyState } from "@/components/empty-state";
import { PageHeader } from "@/components/page-header";
import { StatusBadge } from "@/components/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EnrolmentStatus } from "@/generated/prisma/enums";
import { requirePageRole } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { statusLabel } from "@/lib/domain/status";
import { academicYearLabel } from "@/lib/format";
import { listStudents } from "@/lib/services/students";
import { listStudentsQuerySchema } from "@/lib/validation/students";
import { cn } from "@/lib/utils";

export default async function StudentsPage({ searchParams }: PageProps<"/staff/students">) {
  await requirePageRole("REGISTRY_ADMIN");

  const raw = await searchParams;
  const params = Object.fromEntries(
    Object.entries(raw).flatMap(([k, v]) => {
      const value = Array.isArray(v) ? v[0] : v;
      return value ? [[k, value]] : [];
    }),
  );
  // A hand-edited bad query string falls back to the defaults.
  const parsed = listStudentsQuerySchema.safeParse(params);
  const query = parsed.success ? parsed.data : listStudentsQuerySchema.parse({});

  const [result, programmes] = await Promise.all([
    listStudents(query),
    prisma.programme.findMany({ orderBy: { code: "asc" } }),
  ]);

  const hasFilters = Boolean(query.q || query.programmeId || query.status);

  function pageHref(page: number) {
    const next = new URLSearchParams();
    if (query.q) next.set("q", query.q);
    if (query.programmeId) next.set("programmeId", query.programmeId);
    if (query.status) next.set("status", query.status);
    if (page > 1) next.set("page", String(page));
    const qs = next.toString();
    return qs ? `/staff/students?${qs}` : "/staff/students";
  }

  const addButton = (
    <Link href="/staff/students/new" className={buttonVariants()}>
      <Plus className="size-4" />
      Add student
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Students"
        description="Search, filter and manage every student on the register."
        actions={addButton}
      />

      <Form action="/staff/students" className="surface flex flex-wrap items-end gap-3 p-4">
        <label className="flex min-w-56 flex-1 flex-col gap-1.5 text-sm">
          <span className="font-medium">Search</span>
          <span className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              name="q"
              defaultValue={query.q}
              placeholder="Name, student ID or email"
              className="h-9 pl-8"
            />
          </span>
        </label>
        <label className="flex w-52 flex-col gap-1.5 text-sm">
          <span className="font-medium">Programme</span>
          <NativeSelect name="programmeId" defaultValue={query.programmeId ?? ""} className="h-9">
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex w-44 flex-col gap-1.5 text-sm">
          <span className="font-medium">Status</span>
          <NativeSelect name="status" defaultValue={query.status ?? ""} className="h-9">
            <option value="">All statuses</option>
            {Object.values(EnrolmentStatus).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit" className="h-9">
          <Search className="size-4" />
          Search
        </Button>
        {hasFilters && (
          <Link
            href="/staff/students"
            className={cn(buttonVariants({ variant: "ghost" }), "h-9")}
          >
            <X className="size-4" />
            Clear
          </Link>
        )}
      </Form>

      {result.data.length === 0 ? (
        <EmptyState
          icon={hasFilters ? Search : Users}
          title={hasFilters ? "No students match these filters" : "No students yet"}
          description={
            hasFilters
              ? "Try a different search, or clear the filters to see everyone."
              : "Add the first student to start the register."
          }
          action={
            hasFilters ? (
              <Link href="/staff/students" className={buttonVariants({ variant: "outline" })}>
                Clear filters
              </Link>
            ) : (
              <Link href="/staff/students/new" className={buttonVariants()}>
                <UserPlus className="size-4" />
                Add student
              </Link>
            )
          }
        />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Programme</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {result.data.map((s) => (
              <TableRow key={s.id}>
                <TableCell className="font-mono text-[0.8rem]">
                  <Link
                    href={`/staff/students/${s.id}`}
                    className="font-medium text-info underline-offset-4 hover:underline"
                  >
                    {s.studentNumber}
                  </Link>
                </TableCell>
                <TableCell className="font-medium">{s.fullName}</TableCell>
                <TableCell className="max-w-56 truncate text-muted-foreground" title={s.email}>
                  {s.email}
                </TableCell>
                <TableCell>{s.programme.code}</TableCell>
                <TableCell className="tabular-nums">{academicYearLabel(s.academicYear)}</TableCell>
                <TableCell>
                  <StatusBadge status={s.status} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {result.total > 0 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {result.total} {result.total === 1 ? "student" : "students"} · page {result.page} of{" "}
            {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={pageHref(result.page - 1)}
                className={buttonVariants({ variant: "outline" })}
              >
                <ChevronLeft className="size-4" />
                Previous
              </Link>
            ) : (
              <Button variant="outline" disabled>
                <ChevronLeft className="size-4" />
                Previous
              </Button>
            )}
            {result.page < result.totalPages ? (
              <Link
                href={pageHref(result.page + 1)}
                className={buttonVariants({ variant: "outline" })}
              >
                Next
                <ChevronRight className="size-4" />
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Next
                <ChevronRight className="size-4" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

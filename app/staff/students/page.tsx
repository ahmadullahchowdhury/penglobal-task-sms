import Link from "next/link";
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Students</h1>
        <Link href="/staff/students/new" className={buttonVariants()}>
          Add student
        </Link>
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Search</span>
          <Input
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Name, student ID or email"
          />
        </label>
        <label className="flex w-52 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Programme</span>
          <NativeSelect name="programmeId" defaultValue={query.programmeId ?? ""}>
            <option value="">All programmes</option>
            {programmes.map((p) => (
              <option key={p.id} value={p.id}>
                {p.code}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="flex w-40 flex-col gap-1 text-sm">
          <span className="text-muted-foreground">Status</span>
          <NativeSelect name="status" defaultValue={query.status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(EnrolmentStatus).map((s) => (
              <option key={s} value={s}>
                {statusLabel(s)}
              </option>
            ))}
          </NativeSelect>
        </label>
        <Button type="submit">Search</Button>
        {hasFilters && (
          <Link href="/staff/students" className={buttonVariants({ variant: "ghost" })}>
            Clear
          </Link>
        )}
      </form>

      {result.data.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-10 text-center">
          <p className="font-medium">
            {hasFilters ? "No students match these filters" : "No students yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasFilters
              ? "Try a different search or clear the filters."
              : "Add the first student to get started."}
          </p>
        </div>
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
                <TableCell className="font-mono">
                  <Link href={`/staff/students/${s.id}`} className="underline-offset-4 hover:underline">
                    {s.studentNumber}
                  </Link>
                </TableCell>
                <TableCell>{s.fullName}</TableCell>
                <TableCell className="text-muted-foreground">{s.email}</TableCell>
                <TableCell>{s.programme.code}</TableCell>
                <TableCell>{academicYearLabel(s.academicYear)}</TableCell>
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
            {result.total} {result.total === 1 ? "student" : "students"}, page {result.page} of{" "}
            {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link href={pageHref(result.page - 1)} className={buttonVariants({ variant: "outline" })}>
                Previous
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Previous
              </Button>
            )}
            {result.page < result.totalPages ? (
              <Link href={pageHref(result.page + 1)} className={buttonVariants({ variant: "outline" })}>
                Next
              </Link>
            ) : (
              <Button variant="outline" disabled>
                Next
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

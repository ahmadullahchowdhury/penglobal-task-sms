"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { createStudentSchema } from "@/lib/validation/students";

type FormInput = z.input<typeof createStudentSchema>;
type FormOutput = z.output<typeof createStudentSchema>;

type ProgrammeOption = { id: string; code: string; name: string };

export function CreateStudentForm({
  programmes,
  defaultYear,
}: {
  programmes: ProgrammeOption[];
  defaultYear: number;
}) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(createStudentSchema),
    defaultValues: { programmeId: "", academicYear: defaultYear },
  });

  async function onSubmit(values: FormOutput) {
    setFormError(null);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json();
    if (res.ok) {
      router.push(`/staff/students/${body.student.id}`);
      return;
    }

    // Show server-side field errors (duplicate email, unknown programme) on the field.
    const fields: Record<string, string[]> = body.error?.fields ?? {};
    let placed = false;
    for (const [name, messages] of Object.entries(fields)) {
      if (name in createStudentSchema.shape) {
        setError(name as keyof FormInput, { message: messages[0] });
        placed = true;
      }
    }
    if (!placed) setFormError(body.error?.message ?? "Could not create the student");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl space-y-5" noValidate>
      <Field label="Full name" htmlFor="fullName" error={errors.fullName?.message}>
        <Input id="fullName" autoComplete="off" aria-invalid={!!errors.fullName} {...register("fullName")} />
      </Field>

      <Field label="Email" htmlFor="email" error={errors.email?.message}>
        <Input id="email" type="email" autoComplete="off" aria-invalid={!!errors.email} {...register("email")} />
      </Field>

      <Field label="Date of birth" htmlFor="dateOfBirth" error={errors.dateOfBirth?.message}>
        <Input id="dateOfBirth" type="date" aria-invalid={!!errors.dateOfBirth} {...register("dateOfBirth")} />
      </Field>

      <Field label="Programme" htmlFor="programmeId" error={errors.programmeId?.message}>
        <NativeSelect id="programmeId" aria-invalid={!!errors.programmeId} {...register("programmeId")}>
          <option value="">Choose a programme</option>
          {programmes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </NativeSelect>
      </Field>

      <Field
        label="Academic year (starting year)"
        htmlFor="academicYear"
        error={errors.academicYear?.message}
      >
        <Input
          id="academicYear"
          type="number"
          aria-invalid={!!errors.academicYear}
          {...register("academicYear", { valueAsNumber: true })}
        />
      </Field>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Creating…" : "Create student"}
        </Button>
        <Link href="/staff/students" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

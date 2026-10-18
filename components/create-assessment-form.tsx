"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";

// The browser's datetime-local value has no timezone, so it is read as the
// viewer's local time and sent to the API as a UTC timestamp.
const formSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  moduleId: z.string().min(1, "Choose a module"),
  deadline: z
    .string()
    .min(1, "Choose a deadline")
    .refine((v) => new Date(v).getTime() > Date.now(), "Deadline must be in the future"),
});

type FormValues = z.infer<typeof formSchema>;
type ModuleOption = { id: string; code: string; name: string; programmeCode: string };

export function CreateAssessmentForm({ modules }: { modules: ModuleOption[] }) {
  const router = useRouter();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { title: "", moduleId: "", deadline: "" },
  });

  async function onSubmit(values: FormValues) {
    setFormError(null);
    const res = await fetch("/api/assessments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: values.title,
        moduleId: values.moduleId,
        deadline: new Date(values.deadline).toISOString(),
      }),
    });
    if (res.ok) {
      router.push("/staff/assessments");
      router.refresh();
      return;
    }

    const body = await res.json();
    const fields: Record<string, string[]> = body.error?.fields ?? {};
    let placed = false;
    for (const name of ["title", "moduleId", "deadline"] as const) {
      if (fields[name]) {
        setError(name, { message: fields[name][0] });
        placed = true;
      }
    }
    if (!placed) setFormError(body.error?.message ?? "Could not create the assessment");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" aria-invalid={!!errors.title} {...register("title")} />
        {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="moduleId">Module</Label>
        <NativeSelect id="moduleId" aria-invalid={!!errors.moduleId} {...register("moduleId")}>
          <option value="">Choose a module</option>
          {modules.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} · {m.name} ({m.programmeCode})
            </option>
          ))}
        </NativeSelect>
        {errors.moduleId && <p className="text-sm text-destructive">{errors.moduleId.message}</p>}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="deadline">Deadline (your local time)</Label>
        <Input
          id="deadline"
          type="datetime-local"
          aria-invalid={!!errors.deadline}
          {...register("deadline")}
        />
        {errors.deadline && <p className="text-sm text-destructive">{errors.deadline.message}</p>}
      </div>

      <p className="text-sm text-muted-foreground">
        New assessments start as a draft. Students cannot see them until you open them.
      </p>

      {formError && (
        <p role="alert" className="text-sm text-destructive">
          {formError}
        </p>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          {isSubmitting ? "Creating…" : "Create draft"}
        </Button>
        <Link href="/staff/assessments" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
      </div>
    </form>
  );
}

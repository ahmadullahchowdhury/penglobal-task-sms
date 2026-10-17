import { prisma } from "@/lib/db";
import {
  assessmentStateLabel,
  canEditAssessment,
  canOpenWithDeadline,
  canTransitionAssessment,
} from "@/lib/domain/assessment";
import { ApiError } from "@/lib/http";
import type {
  CreateAssessmentInput,
  ListAssessmentsQuery,
  UpdateAssessmentInput,
} from "@/lib/validation/assessments";

const moduleSummary = {
  select: { id: true, code: true, name: true, programme: { select: { code: true } } },
} as const;

export async function createAssessment(input: CreateAssessmentInput, actorId: string) {
  const mod = await prisma.module.findUnique({ where: { id: input.moduleId } });
  if (!mod) {
    throw new ApiError(400, "VALIDATION_ERROR", "Invalid request", {
      moduleId: ["Module not found"],
    });
  }

  return prisma.assessment.create({
    data: {
      title: input.title,
      moduleId: mod.id,
      deadline: new Date(input.deadline),
      state: input.state,
      createdById: actorId,
    },
    include: { module: moduleSummary },
  });
}

// Each assessment comes back with how many submissions it has and how many were late.
export async function listAssessments(query: ListAssessmentsQuery) {
  const assessments = await prisma.assessment.findMany({
    where: {
      ...(query.moduleId && { moduleId: query.moduleId }),
      ...(query.state && { state: query.state }),
    },
    include: { module: moduleSummary, _count: { select: { submissions: true } } },
    orderBy: [{ deadline: "desc" }, { id: "asc" }],
  });

  const late = await prisma.submission.groupBy({
    by: ["assessmentId"],
    where: { isLate: true, assessmentId: { in: assessments.map((a) => a.id) } },
    _count: { _all: true },
  });
  const lateByAssessment = new Map(late.map((l) => [l.assessmentId, l._count._all]));

  return assessments.map(({ _count, ...a }) => ({
    ...a,
    submissionCount: _count.submissions,
    lateCount: lateByAssessment.get(a.id) ?? 0,
  }));
}

export async function updateAssessment(id: string, input: UpdateAssessmentInput) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.assessment.findUnique({ where: { id } });
    if (!current) throw new ApiError(404, "NOT_FOUND", "Assessment not found");

    const { title, deadline, state } = input;

    if ((title !== undefined || deadline !== undefined) && !canEditAssessment(current.state)) {
      throw new ApiError(422, "ASSESSMENT_CLOSED", "A closed assessment can no longer be edited");
    }

    if (state !== undefined) {
      if (!canTransitionAssessment(current.state, state)) {
        throw new ApiError(
          422,
          "ILLEGAL_TRANSITION",
          current.state === state
            ? `Assessment is already ${assessmentStateLabel(state).toLowerCase()}`
            : `A ${assessmentStateLabel(current.state).toLowerCase()} assessment cannot be changed to ${assessmentStateLabel(state).toLowerCase()}`,
        );
      }
      const effectiveDeadline = deadline ? new Date(deadline) : current.deadline;
      if (state === "OPEN" && !canOpenWithDeadline(effectiveDeadline, new Date())) {
        throw new ApiError(
          422,
          "DEADLINE_PASSED",
          "The deadline has passed. Set a new deadline before opening.",
          { deadline: ["Choose a deadline in the future"] },
        );
      }
    }

    // Conditional on the state we checked, so two people acting at once cannot both win.
    const { count } = await tx.assessment.updateMany({
      where: { id, state: current.state },
      data: {
        ...(title !== undefined && { title }),
        ...(deadline !== undefined && { deadline: new Date(deadline) }),
        ...(state !== undefined && { state }),
      },
    });
    if (count === 0) {
      throw new ApiError(409, "STATE_CHANGED", "The assessment changed. Reload and try again.");
    }

    return tx.assessment.findUniqueOrThrow({ where: { id }, include: { module: moduleSummary } });
  });
}

import type { AssessmentState } from "@/generated/prisma/enums";
import { prisma } from "@/lib/db";
import { classify, type Classification } from "@/lib/domain/classification";

export type AssessmentProgress = {
  id: string;
  title: string;
  state: AssessmentState;
  deadline: Date;
  moduleCode: string;
  submitted: number;
  late: number;
  graded: number;
  toGrade: number;
  withheld: number;
};

// Academic staff dashboard numbers. A grade only exists for a submission, so
// "to grade" is submitted minus graded. Loads everything, which is fine at this
// scale; a larger system would aggregate in SQL.
export async function getStaffDashboard() {
  const assessments = await prisma.assessment.findMany({
    select: {
      id: true,
      title: true,
      state: true,
      deadline: true,
      module: { select: { code: true } },
      submissions: { select: { isLate: true } },
      grades: { select: { score: true, isPublished: true } },
    },
    orderBy: [{ deadline: "asc" }, { id: "asc" }],
  });

  const distribution: Record<Classification, number> = {
    Distinction: 0,
    Merit: 0,
    Pass: 0,
    Fail: 0,
  };

  const progress: AssessmentProgress[] = assessments.map((a) => {
    const withheld = a.grades.filter((g) => !g.isPublished).length;
    for (const g of a.grades) {
      if (g.isPublished) distribution[classify(g.score)] += 1;
    }
    return {
      id: a.id,
      title: a.title,
      state: a.state,
      deadline: a.deadline,
      moduleCode: a.module.code,
      submitted: a.submissions.length,
      late: a.submissions.filter((s) => s.isLate).length,
      graded: a.grades.length,
      toGrade: Math.max(a.submissions.length - a.grades.length, 0),
      withheld,
    };
  });

  const count = (state: AssessmentState) => progress.filter((a) => a.state === state).length;

  return {
    openCount: count("OPEN"),
    draftCount: count("DRAFT"),
    closedCount: count("CLOSED"),
    toGrade: progress.reduce((t, a) => t + a.toGrade, 0),
    withheld: progress.reduce((t, a) => t + a.withheld, 0),
    late: progress.reduce((t, a) => t + a.late, 0),
    // Work waiting on the marker, most overdue deadline first.
    needsMarking: progress.filter((a) => a.toGrade > 0 || a.withheld > 0),
    // Open assessments still taking submissions, soonest deadline first.
    openAssessments: progress.filter((a) => a.state === "OPEN"),
    drafts: progress.filter((a) => a.state === "DRAFT"),
    distribution,
    publishedTotal: Object.values(distribution).reduce((t, n) => t + n, 0),
  };
}

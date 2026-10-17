import "dotenv/config";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

// Integration test against the real database. Every assessment it creates has this
// title prefix, and only those are removed afterwards.
const PREFIX = "[assessments.test] ";
const hasDb = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDb)("assessments service", () => {
  let prisma: typeof import("@/lib/db").prisma;
  let svc: typeof import("./assessments");
  let moduleId: string;
  let staffId: string;

  const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();
  const make = (title: string, extra: Partial<{ deadline: string; state: "DRAFT" | "OPEN" }> = {}) =>
    svc.createAssessment(
      { title: PREFIX + title, moduleId, deadline: inDays(7), state: "DRAFT", ...extra },
      staffId,
    );

  async function cleanup() {
    await prisma.assessment.deleteMany({ where: { title: { startsWith: PREFIX } } });
  }

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/db"));
    svc = await import("./assessments");
    moduleId = (await prisma.module.findFirstOrThrow()).id;
    staffId = (await prisma.user.findFirstOrThrow({ where: { role: "STAFF" } })).id;
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
    await prisma.$disconnect();
  });

  it("creates a Draft by default, linked to the module and creator", async () => {
    const a = await make("draft");
    expect(a).toMatchObject({ state: "DRAFT", moduleId, createdById: staffId });
    expect(a.module.code).toBeTruthy();
  });

  it("rejects an unknown module", async () => {
    await expect(
      svc.createAssessment(
        { title: PREFIX + "x", moduleId: "nope", deadline: inDays(1), state: "DRAFT" },
        staffId,
      ),
    ).rejects.toMatchObject({ status: 400, fields: { moduleId: expect.any(Array) } });
  });

  it("moves Draft -> Open -> Closed", async () => {
    const a = await make("lifecycle");
    expect((await svc.updateAssessment(a.id, { state: "OPEN" })).state).toBe("OPEN");
    expect((await svc.updateAssessment(a.id, { state: "CLOSED" })).state).toBe("CLOSED");
  });

  it("rejects illegal transitions", async () => {
    const a = await make("illegal");
    await expect(svc.updateAssessment(a.id, { state: "CLOSED" })).rejects.toMatchObject({
      status: 422,
      code: "ILLEGAL_TRANSITION",
    });
    await svc.updateAssessment(a.id, { state: "OPEN" });
    await svc.updateAssessment(a.id, { state: "CLOSED" });
    await expect(svc.updateAssessment(a.id, { state: "OPEN" })).rejects.toMatchObject({
      code: "ILLEGAL_TRANSITION",
    });
  });

  it("does not open an assessment whose deadline has passed, unless a new one is set", async () => {
    const a = await make("stale");
    await prisma.assessment.update({
      where: { id: a.id },
      data: { deadline: new Date(Date.now() - 86_400_000) },
    });
    await expect(svc.updateAssessment(a.id, { state: "OPEN" })).rejects.toMatchObject({
      code: "DEADLINE_PASSED",
    });
    const opened = await svc.updateAssessment(a.id, { state: "OPEN", deadline: inDays(3) });
    expect(opened.state).toBe("OPEN");
  });

  it("edits title and deadline until closed, then refuses", async () => {
    const a = await make("editable");
    const edited = await svc.updateAssessment(a.id, { title: PREFIX + "renamed", deadline: inDays(10) });
    expect(edited.title).toBe(PREFIX + "renamed");

    await svc.updateAssessment(a.id, { state: "OPEN" });
    await svc.updateAssessment(a.id, { state: "CLOSED" });
    await expect(svc.updateAssessment(a.id, { title: PREFIX + "again" })).rejects.toMatchObject({
      code: "ASSESSMENT_CLOSED",
    });
  });

  it("returns 404 for an unknown assessment", async () => {
    await expect(svc.updateAssessment("nope", { state: "OPEN" })).rejects.toMatchObject({
      status: 404,
    });
  });

  it("lists with submission and late counts, and filters by state", async () => {
    const a = await make("listed", { state: "OPEN" });
    const all = await svc.listAssessments({});
    const row = all.find((x) => x.id === a.id);
    expect(row).toMatchObject({ submissionCount: 0, lateCount: 0 });

    const drafts = await svc.listAssessments({ state: "DRAFT" });
    expect(drafts.every((x) => x.state === "DRAFT")).toBe(true);
    expect(drafts.find((x) => x.id === a.id)).toBeUndefined();
  });
});

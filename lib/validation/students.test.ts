import { describe, expect, it } from "vitest";
import { changeStatusSchema, createStudentSchema, listStudentsQuerySchema } from "./students";

const years = (n: number) => {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - n);
  return d.toISOString().slice(0, 10);
};

const valid = {
  fullName: "Ada Lovelace",
  email: "ada@example.com",
  dateOfBirth: "2003-04-05",
  programmeId: "p1",
  academicYear: 2025,
};

describe("createStudentSchema", () => {
  it("accepts a valid student", () => {
    expect(createStudentSchema.safeParse(valid).success).toBe(true);
  });

  it("trims names and lower-cases the email, so duplicates cannot differ by case", () => {
    const r = createStudentSchema.safeParse({
      ...valid,
      fullName: "  Ada Lovelace ",
      email: "  Ada@Example.COM ",
    });
    expect(r.success && r.data).toMatchObject({ fullName: "Ada Lovelace", email: "ada@example.com" });
  });

  it.each(["", "nope", "a@", "@b.com"])("rejects the email %j", (email) => {
    expect(createStudentSchema.safeParse({ ...valid, email }).success).toBe(false);
  });

  it("rejects a blank name", () => {
    expect(createStudentSchema.safeParse({ ...valid, fullName: "  " }).success).toBe(false);
  });

  it("rejects a date of birth in the future, today, too young or too old", () => {
    const today = new Date().toISOString().slice(0, 10);
    for (const dateOfBirth of ["2999-01-01", today, years(10), years(120)]) {
      expect(createStudentSchema.safeParse({ ...valid, dateOfBirth }).success).toBe(false);
    }
    expect(createStudentSchema.safeParse({ ...valid, dateOfBirth: years(30) }).success).toBe(true);
  });

  it("rejects a malformed or impossible date", () => {
    for (const dateOfBirth of ["05/04/2003", "2003-13-40", "yesterday", ""]) {
      expect(createStudentSchema.safeParse({ ...valid, dateOfBirth }).success).toBe(false);
    }
  });

  it("rejects an academic year that is not a sensible whole number", () => {
    for (const academicYear of [1999, 2101, 2025.5, "2025", NaN]) {
      expect(createStudentSchema.safeParse({ ...valid, academicYear }).success).toBe(false);
    }
  });

  it("defaults the status to Enrolled and also accepts Deferred", () => {
    const none = createStudentSchema.safeParse(valid);
    expect(none.success && none.data.status).toBe("ENROLLED");
    const deferred = createStudentSchema.safeParse({ ...valid, status: "DEFERRED" });
    expect(deferred.success && deferred.data.status).toBe("DEFERRED");
  });

  it("does not allow a new student to start as Withdrawn, Completed or anything else", () => {
    for (const status of ["WITHDRAWN", "COMPLETED", "GONE", ""]) {
      expect(createStudentSchema.safeParse({ ...valid, status }).success, status).toBe(false);
    }
  });

  it("requires a programme", () => {
    expect(createStudentSchema.safeParse({ ...valid, programmeId: "" }).success).toBe(false);
  });
});

describe("listStudentsQuerySchema", () => {
  it("defaults to page 1 with the default page size", () => {
    expect(listStudentsQuerySchema.parse({})).toMatchObject({ page: 1, pageSize: 20 });
  });

  it("coerces query-string numbers and enforces limits", () => {
    expect(listStudentsQuerySchema.parse({ page: "3", pageSize: "50" })).toMatchObject({
      page: 3,
      pageSize: 50,
    });
    for (const bad of [{ page: "0" }, { page: "-1" }, { pageSize: "0" }, { pageSize: "1000" }, { page: "x" }]) {
      expect(listStudentsQuerySchema.safeParse(bad).success).toBe(false);
    }
  });

  it("accepts only real statuses", () => {
    expect(listStudentsQuerySchema.safeParse({ status: "DEFERRED" }).success).toBe(true);
    expect(listStudentsQuerySchema.safeParse({ status: "GONE" }).success).toBe(false);
  });
});

describe("changeStatusSchema", () => {
  it("needs a real status and treats a blank reason as none", () => {
    expect(changeStatusSchema.safeParse({ toStatus: "WITHDRAWN" }).success).toBe(true);
    expect(changeStatusSchema.safeParse({ toStatus: "GONE" }).success).toBe(false);
    const r = changeStatusSchema.safeParse({ toStatus: "ENROLLED", reason: "   " });
    expect(r.success && r.data.reason).toBeUndefined();
  });
});

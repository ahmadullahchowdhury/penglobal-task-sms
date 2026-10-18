import { describe, expect, it } from "vitest";
import { sanitizeFileName, validateUpload } from "./file-validation";

const PDF = "application/pdf";
const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const pdfHead = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);
const zipHead = Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]);
const exeHead = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00]); // MZ

const check = (name: string, mimeType: string, head: Uint8Array, size = 1000) =>
  validateUpload({ name, mimeType, size, head });

describe("validateUpload", () => {
  it("accepts a real PDF and a real DOCX", () => {
    expect(check("essay.pdf", PDF, pdfHead)).toMatchObject({ ok: true, kind: "pdf", extension: ".pdf" });
    expect(check("essay.docx", DOCX, zipHead)).toMatchObject({ ok: true, kind: "docx", mimeType: DOCX });
  });

  it("accepts an upper-case extension and MIME type", () => {
    expect(check("ESSAY.PDF", PDF.toUpperCase(), pdfHead).ok).toBe(true);
  });

  it("rejects an .exe", () => {
    expect(check("setup.exe", "application/x-msdownload", exeHead)).toMatchObject({
      ok: false,
      code: "UNSUPPORTED_TYPE",
    });
  });

  it("rejects an .exe renamed to .pdf, even with a PDF MIME type", () => {
    expect(check("setup.pdf", PDF, exeHead)).toMatchObject({ ok: false, code: "SIGNATURE_MISMATCH" });
  });

  it("rejects a zip renamed to .pdf, and a PDF renamed to .docx", () => {
    expect(check("a.pdf", PDF, zipHead)).toMatchObject({ code: "SIGNATURE_MISMATCH" });
    expect(check("a.docx", DOCX, pdfHead)).toMatchObject({ code: "SIGNATURE_MISMATCH" });
  });

  it("rejects when the extension and the declared MIME type disagree", () => {
    expect(check("a.pdf", DOCX, pdfHead)).toMatchObject({ code: "MIME_MISMATCH" });
    expect(check("a.docx", "application/octet-stream", zipHead)).toMatchObject({ code: "MIME_MISMATCH" });
  });

  it("looks only at the final extension", () => {
    expect(check("report.pdf.exe", PDF, pdfHead)).toMatchObject({ code: "UNSUPPORTED_TYPE" });
    expect(check("noextension", PDF, pdfHead)).toMatchObject({ code: "UNSUPPORTED_TYPE" });
  });

  it("rejects an empty file and one over the limit", () => {
    expect(check("a.pdf", PDF, pdfHead, 0)).toMatchObject({ code: "EMPTY_FILE" });
    const limit = 5 * 1024 * 1024;
    expect(validateUpload({ name: "a.pdf", mimeType: PDF, size: limit, head: pdfHead }, limit).ok).toBe(true);
    expect(validateUpload({ name: "a.pdf", mimeType: PDF, size: limit + 1, head: pdfHead }, limit)).toMatchObject({
      code: "FILE_TOO_LARGE",
    });
  });

  it("rejects a file shorter than the signature", () => {
    expect(check("a.pdf", PDF, Uint8Array.from([0x25, 0x50]))).toMatchObject({ code: "SIGNATURE_MISMATCH" });
  });
});

describe("sanitizeFileName", () => {
  it("keeps only the last path segment", () => {
    expect(sanitizeFileName("C:\\Users\\me\\essay.pdf")).toBe("essay.pdf");
    expect(sanitizeFileName("../../etc/passwd.pdf")).toBe("passwd.pdf");
  });
  it("drops control characters and falls back when nothing is left", () => {
    expect(sanitizeFileName("a\u0000b\nc.pdf")).toBe("abc.pdf");
    expect(sanitizeFileName("  ")).toBe("upload");
  });
  it("limits the length but keeps the end, where the extension is", () => {
    const out = sanitizeFileName("x".repeat(500) + ".pdf");
    expect(out).toHaveLength(200);
    expect(out.endsWith(".pdf")).toBe(true);
  });
});

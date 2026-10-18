import { MAX_UPLOAD_BYTES } from "@/lib/constants";

const FILE_TYPES = {
  pdf: {
    extension: ".pdf",
    mimeType: "application/pdf",
    signature: [0x25, 0x50, 0x44, 0x46], // %PDF
  },
  docx: {
    extension: ".docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    signature: [0x50, 0x4b, 0x03, 0x04], // PK.. (a zip container)
  },
} as const;

export type FileKind = keyof typeof FILE_TYPES;

export type UploadCheck =
  | { ok: true; kind: FileKind; extension: string; mimeType: string }
  | {
      ok: false;
      code:
        | "EMPTY_FILE"
        | "FILE_TOO_LARGE"
        | "UNSUPPORTED_TYPE"
        | "MIME_MISMATCH"
        | "SIGNATURE_MISMATCH";
      message: string;
    };

const reject = (code: Extract<UploadCheck, { ok: false }>["code"], message: string): UploadCheck => ({
  ok: false,
  code,
  message,
});

// Checks size, extension, declared MIME type and the file's first bytes, and all
// of them have to agree on the same type. The stored MIME type comes from the
// validated kind, never from what the client claimed.
export function validateUpload(
  file: { name: string; mimeType: string; size: number; head: Uint8Array },
  maxBytes: number = MAX_UPLOAD_BYTES,
): UploadCheck {
  if (file.size === 0) return reject("EMPTY_FILE", "The file is empty");
  if (file.size > maxBytes) {
    return reject(
      "FILE_TOO_LARGE",
      `The file is larger than the ${Math.floor(maxBytes / (1024 * 1024))} MB limit`,
    );
  }

  const dot = file.name.lastIndexOf(".");
  const extension = dot === -1 ? "" : file.name.slice(dot).toLowerCase();
  const kind = (Object.keys(FILE_TYPES) as FileKind[]).find(
    (k) => FILE_TYPES[k].extension === extension,
  );
  if (!kind) return reject("UNSUPPORTED_TYPE", "Only PDF and DOCX files can be uploaded");

  const type = FILE_TYPES[kind];
  if (file.mimeType.toLowerCase() !== type.mimeType) {
    return reject("MIME_MISMATCH", `The file type does not match its ${type.extension} extension`);
  }
  if (!type.signature.every((byte, i) => file.head[i] === byte)) {
    return reject(
      "SIGNATURE_MISMATCH",
      `The file contents are not a real ${type.extension.slice(1).toUpperCase()}`,
    );
  }

  return { ok: true, kind, extension: type.extension, mimeType: type.mimeType };
}

// Keeps only the final path segment and drops control characters, so the original
// name is safe to store and to put in a download header.
export function sanitizeFileName(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[\x00-\x1f\x7f]/g, "").trim();
  return cleaned.slice(-200) || "upload";
}

// Shared constants for the reusable attachments module.

export const ATTACHMENTS_BUCKET = "attachments";

// 25 MB — keep in sync with the bucket file_size_limit in the migration.
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// Default expiry for signed URLs (seconds).
export const SIGNED_URL_TTL = 60 * 60;

// Allowlist of safe MIME types for uploads. Keep in sync with the
// `allowed_mime_types` set on the storage bucket in
// supabase/migrations/20260618_restrict_attachment_mime.sql.
// Deliberately EXCLUDES text/html, image/svg+xml and application/xhtml+xml,
// which can execute JS when opened via a signed URL (stored XSS).
export const ALLOWED_MIME_TYPES = [
  // Images
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  // PDF
  "application/pdf",
  // Office documents
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.presentationml.presentation", // pptx
  // Text / data
  "text/csv",
  "text/plain",
  "application/json",
  // Archives
  "application/zip",
];

// Matching file extensions, used as a secondary client-side check for files
// whose browser-reported MIME type is empty or unreliable.
export const ALLOWED_FILE_EXTS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "pdf",
  "docx",
  "xlsx",
  "pptx",
  "csv",
  "txt",
  "json",
  "zip",
];

// True only when BOTH the MIME type and the extension are acceptable.
// An empty/unknown MIME is allowed to pass the MIME check (some browsers omit
// it), but the extension must always be on the allowlist.
export function isAllowedUpload(mime: string, fileName: string): boolean {
  const ext = fileExt(fileName);
  const mimeOk = mime === "" || ALLOWED_MIME_TYPES.includes(mime);
  const extOk = ext !== null && ALLOWED_FILE_EXTS.includes(ext);
  return mimeOk && extOk;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function fileExt(fileName: string): string | null {
  const m = fileName.match(/\.([a-z0-9]+)$/i);
  return m ? m[1].toLowerCase() : null;
}

export function stripExt(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "");
}

export function formatBytes(bytes: number): string {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

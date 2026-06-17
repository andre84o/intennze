// Shared constants for the reusable attachments module.

export const ATTACHMENTS_BUCKET = "attachments";

// 25 MB — keep in sync with the bucket file_size_limit in the migration.
export const MAX_ATTACHMENT_SIZE = 25 * 1024 * 1024;

// Default expiry for signed URLs (seconds).
export const SIGNED_URL_TTL = 60 * 60;

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

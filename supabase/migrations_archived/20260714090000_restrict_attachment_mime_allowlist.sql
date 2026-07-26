-- Migration: 20260714090000_restrict_attachment_mime_allowlist
-- Re-applies the server-side MIME allowlist hardening for the private
-- `attachments` bucket (created in 20260617_add_attachments.sql).
--
-- WHY THIS EXISTS:
-- The hardening in 20260618_restrict_attachment_mime.sql was never applied to
-- production. In live, storage.buckets.allowed_mime_types is NULL for the
-- 'attachments' bucket, so Supabase Storage accepts ANY content-type. A user
-- can upload an .html / .svg / script file with a text/html or image/svg+xml
-- content-type; when opened via a signed URL it executes JavaScript in the
-- Storage origin (stored XSS). Setting allowed_mime_types makes Storage reject
-- those uploads at the API boundary, regardless of the client.
--
-- The allowlist below is the reconciled set of safe formats the app actually
-- uses. It is byte-for-byte identical to:
--   * ALLOWED_MIME_TYPES in src/lib/attachments/constants.ts (client validation)
--   * the array in supabase/migrations/20260618_restrict_attachment_mime.sql
-- Keep all three in sync.
--
-- Deliberately EXCLUDES text/html, image/svg+xml, application/xhtml+xml and any
-- executable/script type (no XSS-capable or code-execution formats).
--
-- Idempotent: safe to re-run; it simply re-asserts the array on the bucket.
-- file_size_limit is intentionally left untouched — it was already set to
-- 26214400 (25 MB) in 20260617_add_attachments.sql and is present in production.
--
-- NOTE: must be applied to production manually via `supabase db push`.

update storage.buckets
set allowed_mime_types = array[
  -- Images
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  -- PDF
  'application/pdf',
  -- Office documents
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',   -- docx
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',         -- xlsx
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', -- pptx
  -- Text / data
  'text/csv',
  'text/plain',
  'application/json',
  -- Archives
  'application/zip'
]
where id = 'attachments';

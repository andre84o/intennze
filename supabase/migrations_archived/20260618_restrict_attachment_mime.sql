-- Migration: 20260618_restrict_attachment_mime
-- Server-side hardening for the private `attachments` bucket (created in
-- 20260617_add_attachments.sql).
--
-- Without an allowlist a user can upload an .html / .svg file with a
-- text/html or image/svg+xml content-type. When opened via a signed URL the
-- file executes JavaScript in the Storage origin (stored XSS). Setting
-- allowed_mime_types makes Supabase Storage reject those uploads at the API
-- boundary, regardless of the client.
--
-- Keep this list in sync with ALLOWED_MIME_TYPES in
-- src/lib/attachments/constants.ts. Deliberately EXCLUDES text/html,
-- image/svg+xml and application/xhtml+xml.
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

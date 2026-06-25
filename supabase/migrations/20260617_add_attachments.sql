-- Migration: 20260617_add_attachments
-- Generic attachments table + private Storage bucket, reusable across any entity
-- (code snippets, leads, customers, ...) via (entity_type, entity_id).

CREATE TABLE IF NOT EXISTS attachments (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at   timestamptz NOT NULL DEFAULT now(),
  created_by   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  entity_type  text        NOT NULL,
  entity_id    uuid        NOT NULL,
  kind         text        NOT NULL CHECK (kind IN ('image', 'document')),
  name         text        NOT NULL,
  file_name    text        NOT NULL,
  mime_type    text        NOT NULL,
  file_ext     text,
  file_size    integer     NOT NULL DEFAULT 0,
  storage_path text        NOT NULL,
  width        integer,
  height       integer
);

CREATE INDEX IF NOT EXISTS idx_attachments_entity
  ON attachments(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_attachments_created_at
  ON attachments(created_at DESC);

ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Same permissive authenticated model as code_snippets (single-admin tool).
CREATE POLICY "Authenticated can read attachments"
  ON attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can insert attachments"
  ON attachments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update attachments"
  ON attachments FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated can delete attachments"
  ON attachments FOR DELETE TO authenticated USING (true);

-- Private bucket (public = false) → files only reachable via signed URLs.
-- 25 MB per-file limit enforced by Storage.
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('attachments', 'attachments', false, 26214400)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload attachments storage"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Authenticated can read attachments storage"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'attachments');
CREATE POLICY "Authenticated can delete attachments storage"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'attachments');

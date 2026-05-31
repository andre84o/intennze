-- Migration: 20260601_add_lead_import_batches
-- Adds lead import batch tracking table, links customers to batches,
-- creates a private Supabase Storage bucket for import files.

CREATE TABLE IF NOT EXISTS lead_import_batches (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at        timestamptz NOT NULL DEFAULT now(),
  created_by        uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name      text        NOT NULL,
  original_filename text        NOT NULL,
  file_type         text        NOT NULL,
  file_size         integer     NOT NULL,
  storage_path      text        NOT NULL,
  total_rows        integer     NOT NULL DEFAULT 0,
  imported_rows     integer     NOT NULL DEFAULT 0,
  duplicate_rows    integer     NOT NULL DEFAULT 0,
  skipped_rows      integer     NOT NULL DEFAULT 0,
  status            text        NOT NULL DEFAULT 'completed'
);

ALTER TABLE customers
  ADD COLUMN IF NOT EXISTS import_batch_id uuid
    REFERENCES lead_import_batches(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_import_batch_id
  ON customers(import_batch_id);

ALTER TABLE lead_import_batches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own import batches"
  ON lead_import_batches FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = created_by);

CREATE POLICY "Users can insert own import batches"
  ON lead_import_batches FOR INSERT TO authenticated
  WITH CHECK ((SELECT auth.uid()) = created_by);

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('lead-imports', 'lead-imports', false, 52428800)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated can upload lead imports"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'lead-imports');

CREATE POLICY "Authenticated can read lead imports"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'lead-imports');

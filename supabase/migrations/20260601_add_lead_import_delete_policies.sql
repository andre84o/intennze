-- Migration: 20260601_add_lead_import_delete_policies
-- Adds DELETE policies for lead_import_batches and storage.objects.
-- Without these, client-side deletes silently affected 0 rows (RLS blocked
-- them) so the row persisted in the DB despite the UI appearing to remove it.
-- Also removes the orphaned Storage file on batch delete.

CREATE POLICY "Users can delete own import batches"
  ON lead_import_batches FOR DELETE TO authenticated
  USING ((SELECT auth.uid()) = created_by);

CREATE POLICY "Authenticated can delete own lead imports"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'lead-imports' AND owner = (SELECT auth.uid()));

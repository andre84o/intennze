-- Migration: 20260602_add_call_companion_realtime
-- Adds Call Companion tables to the supabase_realtime publication so desktop
-- and mobile can subscribe to changes.
--
-- Idempotent and safe:
--   * skips tables already present in the publication (no crash on re-run),
--   * no-op if the supabase_realtime publication does not exist (e.g. minimal
--     local setups), instead of erroring.

DO $$
DECLARE
  tbl     text;
  tables  text[] := ARRAY['call_sessions', 'customers', 'customer_interactions', 'reminders'];
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    RAISE NOTICE 'Publication supabase_realtime does not exist; skipping realtime setup.';
    RETURN;
  END IF;

  FOREACH tbl IN ARRAY tables LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND schemaname = 'public'
        AND tablename = tbl
    ) THEN
      EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', tbl);
    END IF;
  END LOOP;
END $$;

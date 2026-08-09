-- Fix overly permissive RLS on company_settings and code_snippets.
--
-- Both tables previously allowed any authenticated user (including portal
-- customers) to SELECT, INSERT, and UPDATE rows directly via the Supabase
-- client, bypassing the admin-only API-route guards. Replace with
-- is_admin()-scoped policies that match every other sensitive table in this
-- schema.

-- ── company_settings ──────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Authenticated users can read company settings"   ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can insert company settings"  ON public.company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company settings"  ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_select" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_insert" ON public.company_settings;
DROP POLICY IF EXISTS "company_settings_update" ON public.company_settings;

CREATE POLICY "company_settings_select" ON public.company_settings
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "company_settings_insert" ON public.company_settings
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "company_settings_update" ON public.company_settings
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- ── code_snippets ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Allow authenticated users to read code_snippets"   ON public.code_snippets;
DROP POLICY IF EXISTS "Allow authenticated users to insert code_snippets" ON public.code_snippets;
DROP POLICY IF EXISTS "Allow authenticated users to update code_snippets" ON public.code_snippets;
DROP POLICY IF EXISTS "Allow authenticated users to delete code_snippets" ON public.code_snippets;
DROP POLICY IF EXISTS "code_snippets_select" ON public.code_snippets;
DROP POLICY IF EXISTS "code_snippets_insert" ON public.code_snippets;
DROP POLICY IF EXISTS "code_snippets_update" ON public.code_snippets;
DROP POLICY IF EXISTS "code_snippets_delete" ON public.code_snippets;

CREATE POLICY "code_snippets_select" ON public.code_snippets
  FOR SELECT TO authenticated
  USING (public.is_admin());

CREATE POLICY "code_snippets_insert" ON public.code_snippets
  FOR INSERT TO authenticated
  WITH CHECK (public.is_admin());

CREATE POLICY "code_snippets_update" ON public.code_snippets
  FOR UPDATE TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "code_snippets_delete" ON public.code_snippets
  FOR DELETE TO authenticated
  USING (public.is_admin());

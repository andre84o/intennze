-- ── domain_pricing_rules: table-level SELECT grant for authenticated ──────────
--
-- The previous migration (20260730000000) revoked ALL on the table from
-- authenticated before creating the RLS policy. RLS is evaluated only after
-- the role has table-level privilege; without a SELECT grant the policy never
-- fires and Supabase throws "Could not find the table in the schema cache".
--
-- After this migration:
--   • authenticated + is_admin()  → RLS grants SELECT (existing dpr_admin_select)
--   • authenticated (any other role) → RLS returns 0 rows (no row matches)
--   • anon                         → no privilege at all (not granted here)
--   • INSERT / UPDATE / DELETE     → still denied (only SELECT granted)
--   • writes                       → still only via SECURITY DEFINER RPCs

begin;

grant select on table public.domain_pricing_rules to authenticated;
revoke all   on table public.domain_pricing_rules from anon;

commit;

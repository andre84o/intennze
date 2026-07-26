-- ════════════════════════════════════════════════════════════════════════════
-- RESTRICT customer_interactions DELETE TO ADMIN · security hardening
--   CRM notes live in public.customer_interactions (type = 'note'), alongside
--   the rest of the activity log (call/email/meeting/sale/other). The live
--   policy "Allow authenticated users to delete interactions" USING
--   (auth.uid() IS NOT NULL) let ANY authenticated user — including staff —
--   delete them. Staff must NOT be able to delete notes / activity-log rows.
--   Replace the permissive DELETE policy with an admin-only one gated on
--   public.is_admin(). Admins keep delete; staff DELETEs are denied at the DB.
-- Tightening only: no other policy is weakened. Idempotent.
-- Depends on public.is_admin() (roles/permissions foundation, Release A).
-- ════════════════════════════════════════════════════════════════════════════

drop policy if exists "Allow authenticated users to delete interactions" on public.customer_interactions;
drop policy if exists "Admins can delete interactions" on public.customer_interactions;

create policy "Admins can delete interactions" on public.customer_interactions
  for delete to authenticated
  using (public.is_admin());

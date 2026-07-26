-- ════════════════════════════════════════════════════════════════════════════
-- user_permissions FK hardening · prevent orphaned grants that block deletion
--   Previously user_id -> auth.users(id) with NO ACTION (RESTRICT): removing a
--   profile left orphaned user_permissions rows, which then blocked deleting the
--   auth user (Supabase dashboard: "Database error deleting user"). A staff
--   account whose profile was removed could not be deleted until the leftover
--   permission rows were cleared by hand.
--   Fix: user_id now references public.profiles(user_id) ON DELETE CASCADE, so a
--   user's grants are removed together with their profile — grants can never
--   orphan. granted_by now references auth.users(id) ON DELETE SET NULL so that
--   removing the granting admin never blocks a deletion (the grant record
--   survives with a null grantor). Idempotent; no data change (all existing
--   user_id values already have a matching profile).
-- ════════════════════════════════════════════════════════════════════════════

alter table public.user_permissions drop constraint if exists user_permissions_user_id_fkey;
alter table public.user_permissions
  add constraint user_permissions_user_id_fkey
  foreign key (user_id) references public.profiles(user_id) on delete cascade;

alter table public.user_permissions drop constraint if exists user_permissions_granted_by_fkey;
alter table public.user_permissions
  add constraint user_permissions_granted_by_fkey
  foreign key (granted_by) references auth.users(id) on delete set null;

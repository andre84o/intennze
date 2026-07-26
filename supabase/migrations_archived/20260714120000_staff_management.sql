-- ════════════════════════════════════════════════════════════════════════════
-- STAFF MANAGEMENT v1 · ADDITIVE migration
--   profiles.* (address/job columns) · account_status CHECK reconcile ·
--   indexes · INSERT audit ('staff.invited') · last-active-admin protection
--   (verify + extend for 'ended') · set_user_permissions() RPC (admin-only).
-- public.profiles is the SOLE role source. Terminated staff = account_status
-- 'ended' (never hard delete). Idempotent where practical. ADDITIVE only:
-- no existing protection is weakened, no column re-added.
-- Depends on Release A (profiles, is_admin, is_active_profile, log_audit,
-- protect_profiles) and the canonical permission allowlist on user_permissions.
-- ════════════════════════════════════════════════════════════════════════════

-- ── 1. ADD staff profile COLUMNS (nullable text; first/last/email/phone exist) ─
alter table public.profiles add column if not exists address_line text;
alter table public.profiles add column if not exists postal_code  text;
alter table public.profiles add column if not exists city         text;
alter table public.profiles add column if not exists country      text;
alter table public.profiles add column if not exists job_title    text;

-- ── 2. account_status CHECK must allow EXACTLY the four canonical states ───────
-- Inspect the existing CHECK; if it does not already permit all four values
-- ('invited','active','suspended','ended'), drop+recreate it. Named constraints
-- from the Release A inline CHECK are auto-named profiles_account_status_check.
do $$
declare
  c record;
  allows_all boolean := false;
begin
  for c in
    select con.conname, pg_get_constraintdef(con.oid) as def
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace ns on ns.oid = rel.relnamespace
    where ns.nspname = 'public' and rel.relname = 'profiles' and con.contype = 'c'
      and pg_get_constraintdef(con.oid) ilike '%account_status%'
  loop
    if c.def ilike '%''invited''%' and c.def ilike '%''active''%'
       and c.def ilike '%''suspended''%' and c.def ilike '%''ended''%' then
      allows_all := true;
    else
      -- an account_status CHECK exists but is missing a value: drop it
      execute format('alter table public.profiles drop constraint %I', c.conname);
    end if;
  end loop;

  if not allows_all then
    alter table public.profiles
      add constraint profiles_account_status_check
      check (account_status in ('invited','active','suspended','ended'));
  end if;
end $$;

-- ── 3. Indexes (IF NOT EXISTS) ────────────────────────────────────────────────
create index if not exists idx_profiles_role
  on public.profiles(role);
create index if not exists idx_profiles_account_status
  on public.profiles(account_status);
-- partial: fast lookup of usable staff (active + status active)
create index if not exists idx_profiles_active
  on public.profiles(user_id)
  where is_active and account_status = 'active';

-- ── 4. AUDIT for profile INSERT ('staff.invited') ─────────────────────────────
-- When created via admin invite, auth.uid() = admin -> attributed correctly.
-- Bootstrap inserts with null actor: log_audit still writes a row (null actor).
create or replace function public.audit_profile_insert() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  perform public.log_audit(
    'staff.invited', 'profiles', new.user_id::text,
    coalesce(new.email, new.user_id::text),
    null::jsonb,
    jsonb_build_object('role', new.role, 'account_status', new.account_status, 'is_active', new.is_active),
    null, null, 'success');
  return new;
end $$;
drop trigger if exists trg_audit_profile_insert on public.profiles;
create trigger trg_audit_profile_insert after insert on public.profiles
  for each row execute function public.audit_profile_insert();

-- ── 5. VERIFY / EXTEND last-active-admin protection ───────────────────────────
-- The Release A protect_profiles() already blocks removing the last active admin
-- via demote/suspend/deactivate/end/expire, because it fires whenever the OLD row
-- was an active admin and the NEW row is NOT an active admin. is_active_profile()
-- returns false when account_status <> 'active', so account_status = 'ended'
-- (and 'suspended') are covered by the same negation; is_active = false and
-- role = 'staff' are covered too. Self-role change is blocked separately.
-- We re-create the function VERBATIM (adding 'ended' coverage explicitly is a
-- no-op since it is already covered) to guarantee the live state matches and to
-- make the coverage self-documenting. No protection is weakened.
create or replace function public.protect_profiles() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare other_active_admins int;
begin
  if tg_op = 'UPDATE' then
    -- a user may never change their own role
    if (select auth.uid()) is not null and (select auth.uid()) = old.user_id
       and new.role is distinct from old.role then
      raise exception 'You cannot change your own role.';
    end if;
    -- last-active-admin protection: covers demote (role='staff'), suspend
    -- (account_status='suspended'), end (account_status='ended'),
    -- deactivate (is_active=false) and employment-window expiry, because each
    -- of those makes is_active_profile(new.*) false for an admin row.
    if old.role = 'admin'
       and public.is_active_profile(old.is_active, old.account_status, old.employment_start, old.employment_end)
       and not (new.role = 'admin'
         and public.is_active_profile(new.is_active, new.account_status, new.employment_start, new.employment_end))
    then
      select count(*) into other_active_admins from public.profiles
        where role = 'admin' and user_id <> old.user_id
          and public.is_active_profile(is_active, account_status, employment_start, employment_end);
      if other_active_admins = 0 then
        raise exception 'Cannot remove the last active admin (demote/suspend/deactivate/end/expire).';
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.role = 'admin'
       and public.is_active_profile(old.is_active, old.account_status, old.employment_start, old.employment_end) then
      select count(*) into other_active_admins from public.profiles
        where role = 'admin' and user_id <> old.user_id
          and public.is_active_profile(is_active, account_status, employment_start, employment_end);
      if other_active_admins = 0 then
        raise exception 'Cannot delete the last active admin.';
      end if;
    end if;
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_protect_profiles on public.profiles;
create trigger trg_protect_profiles before update or delete on public.profiles
  for each row execute function public.protect_profiles();

-- ── 6. RPC set_user_permissions(uuid, text[]) : admin-only, atomic replace ─────
create or replace function public.set_user_permissions(p_user uuid, p_perms text[])
  returns void language plpgsql security definer set search_path = '' as $$
declare
  v_perm text;
  v_bad  text;
begin
  if not public.is_admin() then
    raise exception 'Only an active admin may set user permissions.'
      using errcode = 'insufficient_privilege';
  end if;

  -- allowlist check: reject any permission not in the canonical set
  select p into v_bad
  from unnest(coalesce(p_perms, array[]::text[])) as p
  where p not in (
    'crm.access','customers.view_own','customers.create','customers.update_own',
    'quotes.view_own','quotes.create','quotes.update_own',
    'emails.send','reminders.manage_own','attachments.upload')
  limit 1;
  if v_bad is not null then
    raise exception 'Invalid permission: %', v_bad;
  end if;

  -- atomic replace of the full permission set for p_user
  delete from public.user_permissions where user_id = p_user;
  foreach v_perm in array coalesce(p_perms, array[]::text[]) loop
    insert into public.user_permissions(user_id, permission, granted_by)
      values (p_user, v_perm, (select auth.uid()))
      on conflict (user_id, permission) do nothing;
  end loop;
end $$;
revoke execute on function public.set_user_permissions(uuid, text[]) from public;
revoke execute on function public.set_user_permissions(uuid, text[]) from anon;
grant  execute on function public.set_user_permissions(uuid, text[]) to authenticated;

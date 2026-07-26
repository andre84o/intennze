-- ════════════════════════════════════════════════════════════════════════════
-- RELEASE A · Foundation
--   profiles · permissions · audit · security functions · ownership columns
-- No role is assigned. No backfill. No RLS change to business tables.
-- Idempotent where practical. Safe to run once on the current schema.
-- ════════════════════════════════════════════════════════════════════════════

-- ── recursive redaction (mask sensitive keys at ANY depth) ───────────────────
create or replace function public.redact(p jsonb) returns jsonb
language plpgsql immutable set search_path = '' as $$
declare k text; v jsonb; out jsonb;
begin
  if p is null then return null; end if;
  if jsonb_typeof(p) = 'object' then
    out := '{}'::jsonb;
    for k, v in select key, value from jsonb_each(p) loop
      if lower(k) in ('personnummer','personal_identity_number','ssn','bank_account',
          'bank_account_number','bank_account_ct','personnummer_ct','password',
          'token','public_token','access_token','refresh_token') then
        out := out || jsonb_build_object(k, to_jsonb('***'::text));
      else
        out := out || jsonb_build_object(k, public.redact(v));
      end if;
    end loop;
    return out;
  elsif jsonb_typeof(p) = 'array' then
    select coalesce(jsonb_agg(public.redact(e)), '[]'::jsonb) into out
      from jsonb_array_elements(p) e;
    return out;
  else
    return p;
  end if;
end $$;
revoke execute on function public.redact(jsonb) from public;

-- ── activeness predicate (Europe/Stockholm calendar date) ────────────────────
create or replace function public.is_active_profile(
  p_is_active boolean, p_account_status text, p_start date, p_end date)
  returns boolean language sql stable set search_path = '' as $$
  select p_is_active
     and p_account_status = 'active'
     and (p_start is null or p_start <= (now() at time zone 'Europe/Stockholm')::date)
     and (p_end   is null or p_end   >= (now() at time zone 'Europe/Stockholm')::date);
$$;

-- ── profiles : SOLE source of truth for roles ────────────────────────────────
-- No ON DELETE CASCADE: staff history survives auth-account deletion (RESTRICT).
-- Secure defaults: new profiles are INACTIVE + 'invited' until admin activates.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id),
  role text not null default 'staff' check (role in ('admin','staff')),
  is_active boolean not null default false,
  commission_eligible boolean not null default false,
  must_change_password boolean not null default false,
  first_name text, last_name text, email text, phone text,
  employment_start date, employment_end date,
  account_status text not null default 'invited'
    check (account_status in ('invited','active','suspended','ended')),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

create or replace function public.is_active_user() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
$$;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
$$;

-- ── permissions (no cascade) ─────────────────────────────────────────────────
create table if not exists public.user_permissions (
  user_id uuid not null references auth.users(id),
  permission text not null check (permission in (
    'crm.access','customers.view_own','customers.create','customers.update_own',
    'quotes.view_own','quotes.create','quotes.update_own',
    'emails.send','reminders.manage_own','attachments.upload')),
  granted_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  primary key (user_id, permission)
);
alter table public.user_permissions enable row level security;

create or replace function public.has_permission(perm text) returns boolean
  language sql stable security definer set search_path = '' as $$
  select public.is_admin()
      or (public.is_active_user() and exists (select 1 from public.user_permissions up
            where up.user_id = (select auth.uid()) and up.permission = perm));
$$;

grant execute on function public.is_admin()          to authenticated;
grant execute on function public.is_active_user()    to authenticated;
grant execute on function public.has_permission(text) to authenticated;

-- ── audit log (append-only; admin-read-only) ─────────────────────────────────
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid, actor_email text, actor_role text,
  action text not null, target_type text, target_id text, target_label text,
  before jsonb, after jsonb, ip text, user_agent text,
  outcome text not null default 'success' check (outcome in ('success','blocked','error')),
  created_at timestamptz not null default now()
);
alter table public.audit_log enable row level security;

-- (a) internal trigger audit: actor = auth.uid(); callable only by owner (triggers)
create or replace function public.log_audit(
  p_action text, p_target_type text, p_target_id text, p_target_label text,
  p_before jsonb, p_after jsonb, p_ip text, p_user_agent text, p_outcome text)
  returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(actor_user_id, actor_email, actor_role, action, target_type,
    target_id, target_label, before, after, ip, user_agent, outcome)
  values ((select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    (select role  from public.profiles where user_id = (select auth.uid())),
    p_action, p_target_type, p_target_id, p_target_label,
    public.redact(p_before), public.redact(p_after), p_ip, p_user_agent, coalesce(p_outcome,'success'));
end $$;
revoke execute on function public.log_audit(text,text,text,text,jsonb,jsonb,text,text,text) from public;

-- (b) trusted server-layer function for BLOCKED / server-side events.
--     Takes only actor_user_id; email + role are fetched from the DB (corr. 5).
create or replace function public.log_security_event(
  p_actor_user_id uuid, p_action text, p_target_type text, p_target_id text, p_target_label text,
  p_before jsonb, p_after jsonb, p_ip text, p_user_agent text, p_outcome text)
  returns void language plpgsql security definer set search_path = '' as $$
begin
  insert into public.audit_log(actor_user_id, actor_email, actor_role, action, target_type,
    target_id, target_label, before, after, ip, user_agent, outcome)
  values (p_actor_user_id,
    (select email from auth.users where id = p_actor_user_id),
    (select role  from public.profiles where user_id = p_actor_user_id),
    p_action, p_target_type, p_target_id, p_target_label,
    public.redact(p_before), public.redact(p_after), p_ip, p_user_agent, coalesce(p_outcome,'blocked'));
end $$;
revoke execute on function public.log_security_event(uuid,text,text,text,text,jsonb,jsonb,text,text,text) from public;
grant  execute on function public.log_security_event(uuid,text,text,text,text,jsonb,jsonb,text,text,text) to service_role;

-- ── RLS: profiles / permissions / audit ──────────────────────────────────────
drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_write  on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and public.is_active_user()));
create policy profiles_write on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists perms_select on public.user_permissions;
drop policy if exists perms_write  on public.user_permissions;
create policy perms_select on public.user_permissions for select to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and public.is_active_user()));
create policy perms_write on public.user_permissions for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (public.is_admin());

-- immutability (blocks UPDATE/DELETE even for service_role via normal DML)
create or replace function public.audit_immutable() returns trigger
  language plpgsql set search_path = '' as $$
begin raise exception 'audit_log is append-only'; end $$;
drop trigger if exists trg_audit_immutable on public.audit_log;
create trigger trg_audit_immutable before update or delete on public.audit_log
  for each row execute function public.audit_immutable();

-- ── profile protection: self-role + last-active-admin ────────────────────────
create or replace function public.protect_profiles() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare other_active_admins int;
begin
  if tg_op = 'UPDATE' then
    if (select auth.uid()) is not null and (select auth.uid()) = old.user_id
       and new.role is distinct from old.role then
      raise exception 'You cannot change your own role.';
    end if;
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

-- audit profile + permission changes
create or replace function public.audit_profile_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.account_status is distinct from old.account_status
     or new.employment_start is distinct from old.employment_start
     or new.employment_end is distinct from old.employment_end
     or new.commission_eligible is distinct from old.commission_eligible then
    perform public.log_audit('profile.change','profiles', old.user_id::text,
      coalesce(old.email, old.user_id::text),
      jsonb_build_object('role',old.role,'is_active',old.is_active,'account_status',old.account_status,
        'employment_start',old.employment_start,'employment_end',old.employment_end,'commission_eligible',old.commission_eligible),
      jsonb_build_object('role',new.role,'is_active',new.is_active,'account_status',new.account_status,
        'employment_start',new.employment_start,'employment_end',new.employment_end,'commission_eligible',new.commission_eligible),
      null, null, 'success');
  end if;
  return new;
end $$;
drop trigger if exists trg_audit_profile_change on public.profiles;
create trigger trg_audit_profile_change after update on public.profiles
  for each row execute function public.audit_profile_change();

create or replace function public.audit_permission_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('permission.grant','user_permissions', new.user_id::text, new.permission,
      null, jsonb_build_object('permission', new.permission), null, null, 'success');
  elsif tg_op = 'DELETE' then
    perform public.log_audit('permission.revoke','user_permissions', old.user_id::text, old.permission,
      jsonb_build_object('permission', old.permission), null, null, null, 'success');
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_permission_ins on public.user_permissions;
drop trigger if exists trg_audit_permission_del on public.user_permissions;
create trigger trg_audit_permission_ins after insert on public.user_permissions
  for each row execute function public.audit_permission_change();
create trigger trg_audit_permission_del after delete on public.user_permissions
  for each row execute function public.audit_permission_change();

drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at_column();

-- ── ownership + archive COLUMNS (Release A) ──────────────────────────────────
alter table public.customers            add column if not exists owner_user_id uuid references auth.users(id);
alter table public.customers            add column if not exists archived_at timestamptz;
alter table public.quotes               add column if not exists owner_user_id uuid references auth.users(id);
alter table public.quotes               add column if not exists archived_at timestamptz;
alter table public.quote_items          add column if not exists archived_at timestamptz;
alter table public.customer_interactions add column if not exists archived_at timestamptz;
alter table public.emails               add column if not exists archived_at timestamptz;

create index if not exists idx_customers_owner    on public.customers(owner_user_id);
create index if not exists idx_customers_archived on public.customers(archived_at);
create index if not exists idx_quotes_owner       on public.quotes(owner_user_id);
create index if not exists idx_quotes_archived    on public.quotes(archived_at);

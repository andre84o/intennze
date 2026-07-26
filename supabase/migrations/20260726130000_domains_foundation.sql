-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2A · Domain model foundation
--   · customers.portal_user_id  (link a CRM customer to their portal login)
--   · domains                    (registrar-agnostic domain records)
--   · domain_registrants         (per-domain legal contact, kept separate)
--   · RLS (admin full / portal customer read-own) · audit triggers
--   · create_manual_domain()     (atomic admin create of domain + registrant)
--
-- Follows existing conventions: text+CHECK (no pg enums), text[] for lists,
-- archived_at soft-delete, update_updated_at_column() triggers, is_admin()/
-- is_active_user() SECURITY DEFINER guards, log_audit() trigger auditing.
-- Minimal, reversible, additive. Does NOT touch existing users/rows. No
-- Openprovider integration, no DNS, no portal pages, no billing.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- 1 · Link a CRM customer to a portal login (auth user)
-- ═══════════════════════════════════════════════════════════════════════════
-- A portal customer (profiles.role='customer') owns domains through their linked
-- customers row. Nullable + ON DELETE SET NULL (an unlinked customer is normal;
-- deleting the auth user unlinks rather than orphans). Additive: every existing
-- customers insert uses a named column list, so they simply get NULL here.
alter table public.customers
  add column if not exists portal_user_id uuid references auth.users(id) on delete set null;

-- At most one customer per portal login (many NULLs allowed — partial unique).
create unique index if not exists uq_customers_portal_user_id
  on public.customers(portal_user_id) where portal_user_id is not null;

-- Only an admin may set/clear the portal link. Extends the existing
-- protect_customer_columns() guard (which already gates owner/created_by/archive)
-- so a staff owner with customers.update_own cannot self-link a portal account.
create or replace function public.protect_customer_columns() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and (
       new.owner_user_id  is distinct from old.owner_user_id
    or new.created_by     is distinct from old.created_by
    or new.archived_at    is distinct from old.archived_at
    or new.portal_user_id is distinct from old.portal_user_id) then
    raise exception 'Only an admin can change ownership, archive state, or the portal link.';
  end if;
  return new;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2 · Ownership helper (SECURITY DEFINER — bypasses customers RLS safely)
-- ═══════════════════════════════════════════════════════════════════════════
-- A portal customer is NOT the owner of their customers row (the owner is staff),
-- so a plain `exists (select from customers ...)` inside a domains policy would be
-- filtered to zero by customers' own RLS. This definer helper resolves ownership
-- directly, mirroring is_admin()/is_active_user(). Returns true iff the current
-- auth user is the portal login for the given (active) customer.
create or replace function public.is_portal_customer_of(p_customer_id uuid) returns boolean
  language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.customers c
    where c.id = p_customer_id
      and c.portal_user_id = (select auth.uid())
      and c.archived_at is null
  );
$$;
revoke execute on function public.is_portal_customer_of(uuid) from public;
grant  execute on function public.is_portal_customer_of(uuid) to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3 · domains
-- ═══════════════════════════════════════════════════════════════════════════
create table if not exists public.domains (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Owner (CRM customer). NOT NULL: a domain always belongs to a customer.
  -- RESTRICT: never silently destroy registry records when a customer is deleted;
  -- domains must be reassigned/archived first.
  customer_id uuid not null references public.customers(id) on delete restrict,

  -- Stored normalized (lowercase, punycode, no scheme/path/trailing dot). The
  -- CHECK is a DB backstop; full format validation lives in the server layer.
  name text not null
    check (name = lower(name) and name !~ '[[:space:]/@]' and char_length(name) between 1 and 253),

  -- Real registrar status — NOT derived from expires_at (we must store the
  -- registrar's actual state once an external registrar is connected).
  status text not null default 'pending'
    check (status in ('pending','active','expired','suspended',
                      'transfer_pending','transferred_out','cancelled','failed')),

  -- Generic provider (not Openprovider-specific). A manual/imported domain needs
  -- no external provider link.
  registrar text not null default 'manual'
    check (registrar in ('manual','openprovider')),
  provider_domain_id text,                 -- nullable until an external registrar is connected

  registered_at timestamptz,
  expires_at timestamptz,
  auto_renew boolean not null default false,
  locked boolean not null default false,
  nameservers text[] not null default '{}',

  created_by uuid references auth.users(id),   -- admin who created it (no ON DELETE — history convention)
  archived_at timestamptz                       -- soft delete
);

-- Globally unique normalized name (case-variants collapse via the lower() CHECK).
create unique index if not exists uq_domains_name on public.domains(name);
create index if not exists idx_domains_customer_id  on public.domains(customer_id);
create index if not exists idx_domains_status       on public.domains(status);
create index if not exists idx_domains_expires_at   on public.domains(expires_at);
create index if not exists idx_domains_archived     on public.domains(archived_at);
create index if not exists idx_domains_provider     on public.domains(provider_domain_id)
  where provider_domain_id is not null;

drop trigger if exists trg_domains_updated_at on public.domains;
create trigger trg_domains_updated_at before update on public.domains
  for each row execute function public.update_updated_at_column();

alter table public.domains enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4 · domain_registrants  (separate legal/contact identity, 1:1 per domain)
-- ═══════════════════════════════════════════════════════════════════════════
-- Deliberately separate from the customer profile: a customer may own several
-- domains with different legal registrants. Sensitive; only fetched when needed.
create table if not exists public.domain_registrants (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  domain_id uuid not null unique references public.domains(id) on delete cascade,

  first_name text,
  last_name text,
  organization text,
  email text,
  phone text,
  address_line1 text,
  address_line2 text,
  city text,
  postal_code text,
  state text,
  country_code text check (country_code is null or country_code ~ '^[A-Z]{2}$')  -- ISO 3166-1 alpha-2
);

create index if not exists idx_domain_registrants_domain_id on public.domain_registrants(domain_id);

drop trigger if exists trg_domain_registrants_updated_at on public.domain_registrants;
create trigger trg_domain_registrants_updated_at before update on public.domain_registrants
  for each row execute function public.update_updated_at_column();

alter table public.domain_registrants enable row level security;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5 · RLS  (admin full · portal customer read-own · staff NO access · writes admin-only)
-- ═══════════════════════════════════════════════════════════════════════════
-- domains
drop policy if exists domains_select on public.domains;
drop policy if exists domains_write  on public.domains;
create policy domains_select on public.domains for select to authenticated using (
  public.is_admin()
  or (public.is_active_user() and public.is_portal_customer_of(customer_id))
);
-- All writes are admin-only: customers can never create/update/delete domains,
-- change customer_id, provider_domain_id, or status. Staff have no access at all
-- (not admin, hold no portal link).
create policy domains_write on public.domains for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- domain_registrants — read-own via the parent domain; writes admin-only.
drop policy if exists domain_registrants_select on public.domain_registrants;
drop policy if exists domain_registrants_write  on public.domain_registrants;
create policy domain_registrants_select on public.domain_registrants for select to authenticated using (
  public.is_admin()
  or (public.is_active_user() and exists (
        select 1 from public.domains d
        where d.id = domain_registrants.domain_id
          and public.is_portal_customer_of(d.customer_id)))
);
create policy domain_registrants_write on public.domain_registrants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- ═══════════════════════════════════════════════════════════════════════════
-- 6 · Audit triggers (reuse the existing append-only audit_log via log_audit)
-- ═══════════════════════════════════════════════════════════════════════════
-- Actor = auth.uid() (always the real admin — domain writes never happen through
-- customer-view). The owning customer_id is recorded as metadata (the effective
-- subject). audit_log.action has no CHECK, so 'domain.*' actions are free.
create or replace function public.audit_domain_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('domain.create','domain', new.id::text, new.name,
      null,
      jsonb_build_object('customer_id', new.customer_id, 'status', new.status,
                         'registrar', new.registrar, 'auto_renew', new.auto_renew),
      null, null, 'success');
    return new;

  elsif tg_op = 'UPDATE' then
    if new.customer_id is distinct from old.customer_id then
      perform public.log_audit('domain.customer_changed','domain', old.id::text, old.name,
        jsonb_build_object('customer_id', old.customer_id),
        jsonb_build_object('customer_id', new.customer_id), null, null, 'success');
    end if;
    if new.status is distinct from old.status then
      perform public.log_audit('domain.status_changed','domain', old.id::text, old.name,
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status), null, null, 'success');
    end if;
    if new.auto_renew is distinct from old.auto_renew then
      perform public.log_audit('domain.autorenew_changed','domain', old.id::text, old.name,
        jsonb_build_object('auto_renew', old.auto_renew),
        jsonb_build_object('auto_renew', new.auto_renew), null, null, 'success');
    end if;
    if new.archived_at is distinct from old.archived_at and new.archived_at is not null then
      perform public.log_audit('domain.archived','domain', old.id::text, old.name,
        null, jsonb_build_object('customer_id', new.customer_id),
        null, null, 'success');
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    perform public.log_audit('domain.deleted','domain', old.id::text, old.name,
      jsonb_build_object('customer_id', old.customer_id, 'status', old.status),
      null, null, null, 'success');
    return old;
  end if;
  return null;
end $$;
drop trigger if exists trg_audit_domain_change on public.domains;
create trigger trg_audit_domain_change after insert or update or delete on public.domains
  for each row execute function public.audit_domain_change();

-- Registrant auditing logs WHICH fields changed (names only) — never the
-- sensitive values. (redact() does NOT mask address/email/phone, so we must not
-- put those values into the audit payload.)
create or replace function public.audit_domain_registrant_change() returns trigger
  language plpgsql security definer set search_path = '' as $$
declare changed text[] := '{}';
begin
  if tg_op = 'DELETE' then
    perform public.log_audit('domain.registrant_changed','domain', old.domain_id::text, null,
      null, jsonb_build_object('op','delete'), null, null, 'success');
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.first_name    is distinct from old.first_name    then changed := changed || 'first_name'::text; end if;
    if new.last_name     is distinct from old.last_name     then changed := changed || 'last_name'::text; end if;
    if new.organization  is distinct from old.organization  then changed := changed || 'organization'::text; end if;
    if new.email         is distinct from old.email         then changed := changed || 'email'::text; end if;
    if new.phone         is distinct from old.phone         then changed := changed || 'phone'::text; end if;
    if new.address_line1 is distinct from old.address_line1 then changed := changed || 'address_line1'::text; end if;
    if new.address_line2 is distinct from old.address_line2 then changed := changed || 'address_line2'::text; end if;
    if new.city          is distinct from old.city          then changed := changed || 'city'::text; end if;
    if new.postal_code   is distinct from old.postal_code   then changed := changed || 'postal_code'::text; end if;
    if new.state         is distinct from old.state         then changed := changed || 'state'::text; end if;
    if new.country_code  is distinct from old.country_code  then changed := changed || 'country_code'::text; end if;
    if array_length(changed, 1) is null then return new; end if;
  else -- INSERT: record which fields were provided (names only)
    if new.first_name    is not null then changed := changed || 'first_name'::text; end if;
    if new.last_name     is not null then changed := changed || 'last_name'::text; end if;
    if new.organization  is not null then changed := changed || 'organization'::text; end if;
    if new.email         is not null then changed := changed || 'email'::text; end if;
    if new.phone         is not null then changed := changed || 'phone'::text; end if;
    if new.address_line1 is not null then changed := changed || 'address_line1'::text; end if;
    if new.address_line2 is not null then changed := changed || 'address_line2'::text; end if;
    if new.city          is not null then changed := changed || 'city'::text; end if;
    if new.postal_code   is not null then changed := changed || 'postal_code'::text; end if;
    if new.state         is not null then changed := changed || 'state'::text; end if;
    if new.country_code  is not null then changed := changed || 'country_code'::text; end if;
  end if;

  perform public.log_audit('domain.registrant_changed','domain', new.domain_id::text, null,
    null,
    jsonb_build_object('op', lower(tg_op), 'changed_fields', to_jsonb(changed)),
    null, null, 'success');
  return new;
end $$;
drop trigger if exists trg_audit_domain_registrant_change on public.domain_registrants;
create trigger trg_audit_domain_registrant_change
  after insert or update or delete on public.domain_registrants
  for each row execute function public.audit_domain_registrant_change();

-- ═══════════════════════════════════════════════════════════════════════════
-- 7 · create_manual_domain() — atomic admin create (domain + optional registrant)
-- ═══════════════════════════════════════════════════════════════════════════
-- SECURITY DEFINER + explicit is_admin() assert (mirrors set_user_permissions).
-- The name MUST arrive already normalized from the server layer (punycode/IDN is
-- done in TS); the DB enforces the normalized-form CHECK + unique index. Runs in
-- one transaction so a domain is never created without its registrant.
create or replace function public.create_manual_domain(
    p_customer_id uuid,
    p_name text,
    p_status text default 'pending',
    p_registered_at timestamptz default null,
    p_expires_at timestamptz default null,
    p_auto_renew boolean default false,
    p_locked boolean default false,
    p_nameservers text[] default '{}',
    p_registrant jsonb default null)
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare v_domain_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create a domain.';
  end if;

  if p_name is null or p_name = '' or p_name <> lower(p_name) then
    raise exception 'Domain name must be normalized (lowercase) before creation.';
  end if;

  if not exists (select 1 from public.customers c
                 where c.id = p_customer_id and c.archived_at is null) then
    raise exception 'Customer not found.';
  end if;

  insert into public.domains(
      customer_id, name, status, registrar,
      registered_at, expires_at, auto_renew, locked, nameservers, created_by)
  values (
      p_customer_id, p_name, coalesce(p_status,'pending'), 'manual',
      p_registered_at, p_expires_at, coalesce(p_auto_renew,false),
      coalesce(p_locked,false), coalesce(p_nameservers,'{}'::text[]), (select auth.uid()))
  returning id into v_domain_id;

  if p_registrant is not null then
    insert into public.domain_registrants(
        domain_id, first_name, last_name, organization, email, phone,
        address_line1, address_line2, city, postal_code, state, country_code)
    values (
        v_domain_id,
        p_registrant->>'first_name', p_registrant->>'last_name', p_registrant->>'organization',
        p_registrant->>'email', p_registrant->>'phone',
        p_registrant->>'address_line1', p_registrant->>'address_line2',
        p_registrant->>'city', p_registrant->>'postal_code', p_registrant->>'state',
        p_registrant->>'country_code');
  end if;

  return v_domain_id;
end $$;
revoke execute on function public.create_manual_domain(uuid,text,text,timestamptz,timestamptz,boolean,boolean,text[],jsonb) from public;
grant  execute on function public.create_manual_domain(uuid,text,text,timestamptz,timestamptz,boolean,boolean,text[],jsonb) to authenticated;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.create_manual_domain(uuid,text,text,timestamptz,timestamptz,boolean,boolean,text[],jsonb);
-- drop table if exists public.domain_registrants;
-- drop table if exists public.domains;
-- drop function if exists public.is_portal_customer_of(uuid);
-- drop index if exists public.uq_customers_portal_user_id;
-- alter table public.customers drop column if exists portal_user_id;
-- -- restore protect_customer_columns() to its pre-2A body (without portal_user_id).

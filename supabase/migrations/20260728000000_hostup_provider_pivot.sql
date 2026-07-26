-- ════════════════════════════════════════════════════════════════════════════
-- Phase 2B · Hostup provider pivot (read-only integration groundwork)
--
-- Hostup becomes the source of truth for registrar-owned data (status, expiry,
-- auto-renew, nameservers, lock, order/domain ids). The local `domains` table
-- keeps: which Intennze customer owns the domain, the Hostup id mapping, a safe
-- cache of registrar fields, sync status, and audit.
--
-- The baseline 20260727000000_initial_schema.sql is LOCKED — this is the forward
-- migration. Changes are ADDITIVE and non-destructive:
--   · provider allowlist: drop 'openprovider' (0 rows, 0 write paths), add 'hostup'
--   · add provider_order_id + last_synced_at
--   · customer_id becomes NULLABLE (unlinked/discovered Hostup domains; admin-only
--     visible via existing RLS, since is_portal_customer_of(NULL) = false)
--   · unique (registrar, provider_domain_id) — a Hostup id links to at most one row
--   · log_hostup_event() audit fn + link_hostup_domain() RPC
--
-- DECISION (documented): the column stays named `registrar` (the "provider"
-- concept). It is NOT renamed to `provider` — a rename would force rewriting the
-- SECURITY DEFINER audit trigger + create_manual_domain RPC for zero functional
-- gain. 'openprovider' is dropped (verified: no data rows, no write path ever set
-- it; create_manual_domain hard-codes 'manual').
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── provider allowlist: manual | hostup ──────────────────────────────────────
alter table public.domains drop constraint if exists domains_registrar_check;
alter table public.domains
  add constraint domains_registrar_check check (registrar in ('manual', 'hostup'));

-- ── provider/sync columns (additive, nullable) ───────────────────────────────
alter table public.domains add column if not exists provider_order_id text;
alter table public.domains add column if not exists last_synced_at timestamptz;

-- ── allow unlinked/discovered Hostup domains (customer assigned later by admin) ─
-- is_portal_customer_of(NULL) = false, so a NULL-customer row is visible ONLY to
-- an admin under the existing domains_select policy. No RLS change needed.
alter table public.domains alter column customer_id drop not null;

-- ── one local row per (provider, Hostup id); NULL ids never collide ──────────
create unique index if not exists uq_domains_provider_domain
  on public.domains (registrar, provider_domain_id)
  where provider_domain_id is not null;

-- admin "unlinked" listing helper
create index if not exists idx_domains_unlinked
  on public.domains (registrar) where customer_id is null;

-- ── document the cache semantics (Hostup is source of truth) ─────────────────
comment on column public.domains.registrar          is 'Provider owning this domain: manual | hostup.';
comment on column public.domains.provider_domain_id is 'Hostup public domain id (dom_...), stored exactly as returned. Unique per provider, nullable until linked.';
comment on column public.domains.provider_order_id  is 'Hostup order id (ord_...), nullable.';
comment on column public.domains.last_synced_at     is 'Last successful read-only sync from Hostup.';
comment on column public.domains.status             is 'CACHE of the Hostup registrar status. Source of truth is Hostup.';
comment on column public.domains.expires_at         is 'CACHE of the Hostup expiry date. Source of truth is Hostup.';
comment on column public.domains.auto_renew         is 'CACHE of Hostup auto-renew. Source of truth is Hostup.';
comment on column public.domains.nameservers        is 'CACHE of Hostup nameservers. Fetch live for the authoritative value.';
comment on column public.domains.locked             is 'CACHE of the Hostup registrar lock. Fetch live for the authoritative value.';

-- ════════════════════════════════════════════════════════════════════════════
-- Audit: HOSTUP_DOMAIN_SYNCED / HOSTUP_DOMAIN_LINKED_TO_CUSTOMER / HOSTUP_SYNC_FAILED
-- Callable by an active admin (interactive) OR the service_role (future cron).
-- actor_user_id = auth.uid() (= realUserId); effective_user_id is passed by the
-- server (the DB can't see the customer-view cookie) and stored in metadata.
-- The caller MUST pass only safe metadata (ids/counts/field-names) — never the
-- API key, EPP codes, or registrant PII. redact() is only a backstop.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.log_hostup_event(
    p_action text,
    p_domain_id uuid default null,
    p_provider_domain_id text default null,
    p_effective_user_id uuid default null,
    p_outcome text default 'success',
    p_metadata jsonb default '{}'::jsonb)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
begin
  if not (public.is_admin() or v_is_service) then
    raise exception 'Not authorized to log a Hostup event.';
  end if;

  if p_action not in ('HOSTUP_DOMAIN_SYNCED','HOSTUP_DOMAIN_LINKED_TO_CUSTOMER','HOSTUP_SYNC_FAILED') then
    raise exception 'Invalid Hostup action: %', p_action;
  end if;

  if coalesce(p_outcome,'success') not in ('success','blocked','error') then
    raise exception 'Invalid outcome: %', p_outcome;
  end if;

  insert into public.audit_log(actor_user_id, actor_email, actor_role, action,
    target_type, target_id, target_label, before, after, ip, user_agent, outcome)
  values (
    (select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    (select role  from public.profiles where user_id = (select auth.uid())),
    p_action, 'domain',
    case when p_domain_id is null then null else p_domain_id::text end,
    null, null,
    public.redact(
      coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
           'provider_domain_id', p_provider_domain_id,
           'effective_user_id',  p_effective_user_id,
           'context', case when v_is_service then 'service' else 'admin' end)),
    null, null, coalesce(p_outcome,'success'));
end $$;

revoke execute on function public.log_hostup_event(text,uuid,text,uuid,text,jsonb) from public;
grant  execute on function public.log_hostup_event(text,uuid,text,uuid,text,jsonb) to authenticated;
grant  execute on function public.log_hostup_event(text,uuid,text,uuid,text,jsonb) to service_role;

-- ════════════════════════════════════════════════════════════════════════════
-- link_hostup_domain(): atomic admin link of a verified Hostup domain to a
-- CUSTOMER. The server verifies the domain against Hostup BEFORE calling this and
-- passes the (already-normalized) name + mapped cache values. This function:
--   · re-asserts is_admin() (defense in depth)
--   · requires the target customer to be an ACTIVE portal customer (role=customer)
--   · refuses to silently reassign a domain already linked to another customer
--   · is idempotent when already linked to the SAME customer
--   · adopts an existing unlinked/same-name row instead of duplicating
-- Never trust a provider id from the browser — the server validates it via Hostup
-- and only then calls this with the verified id.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.link_hostup_domain(
    p_provider_domain_id text,
    p_customer_id uuid,
    p_name text,
    p_order_id text default null,
    p_status text default 'pending',
    p_expires_at timestamptz default null,
    p_auto_renew boolean default false,
    p_locked boolean default false,
    p_nameservers text[] default '{}')
  returns jsonb
  language plpgsql security definer set search_path = ''
as $$
declare
  v_existing public.domains%rowtype;
  v_same_name public.domains%rowtype;
  v_domain_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can link a Hostup domain.';
  end if;

  if p_provider_domain_id is null or btrim(p_provider_domain_id) = '' then
    raise exception 'A Hostup domain id is required.';
  end if;
  if p_name is null or p_name = '' or p_name <> lower(p_name) then
    raise exception 'Domain name must be normalized (lowercase) before linking.';
  end if;

  -- Customer must be an ACTIVE portal customer (profiles.role = 'customer').
  if not exists (
    select 1 from public.customers c
    join public.profiles p on p.user_id = c.portal_user_id
    where c.id = p_customer_id
      and c.archived_at is null
      and p.role = 'customer'
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end)
  ) then
    raise exception 'Target is not an active portal customer.';
  end if;

  -- Look for a row already carrying this (provider, provider_domain_id).
  select * into v_existing from public.domains
    where registrar = 'hostup' and provider_domain_id = p_provider_domain_id
    for update;

  if found then
    if v_existing.customer_id is not null and v_existing.customer_id <> p_customer_id then
      raise exception 'Domain already linked to another customer.';
    end if;
    -- link (or refresh) — idempotent for the same customer.
    update public.domains
      set customer_id     = p_customer_id,
          provider_order_id = coalesce(p_order_id, provider_order_id),
          status          = coalesce(p_status, status),
          expires_at      = p_expires_at,
          auto_renew      = coalesce(p_auto_renew, auto_renew),
          locked          = coalesce(p_locked, locked),
          nameservers     = coalesce(p_nameservers, nameservers),
          last_synced_at  = now()
      where id = v_existing.id;
    v_domain_id := v_existing.id;
    return jsonb_build_object('domain_id', v_domain_id,
      'status', case when v_existing.customer_id = p_customer_id then 'already_linked' else 'linked' end);
  end if;

  -- No provider-id row. Adopt an existing unlinked same-name row if one exists.
  select * into v_same_name from public.domains
    where name = p_name and provider_domain_id is null
    for update;

  if found then
    if v_same_name.customer_id is not null and v_same_name.customer_id <> p_customer_id then
      raise exception 'A domain with this name already exists for another customer.';
    end if;
    update public.domains
      set customer_id       = p_customer_id,
          registrar         = 'hostup',
          provider_domain_id = p_provider_domain_id,
          provider_order_id = p_order_id,
          status            = coalesce(p_status, status),
          expires_at        = p_expires_at,
          auto_renew        = coalesce(p_auto_renew, auto_renew),
          locked            = coalesce(p_locked, locked),
          nameservers       = coalesce(p_nameservers, nameservers),
          last_synced_at    = now()
      where id = v_same_name.id;
    return jsonb_build_object('domain_id', v_same_name.id, 'status', 'linked');
  end if;

  -- Fresh insert.
  insert into public.domains(
      customer_id, name, status, registrar, provider_domain_id, provider_order_id,
      expires_at, auto_renew, locked, nameservers, last_synced_at, created_by)
  values (
      p_customer_id, p_name, coalesce(p_status,'pending'), 'hostup',
      p_provider_domain_id, p_order_id, p_expires_at, coalesce(p_auto_renew,false),
      coalesce(p_locked,false), coalesce(p_nameservers,'{}'::text[]), now(), (select auth.uid()))
  returning id into v_domain_id;

  return jsonb_build_object('domain_id', v_domain_id, 'status', 'created');
end $$;

revoke execute on function public.link_hostup_domain(text,uuid,text,text,text,timestamptz,boolean,boolean,text[]) from public;
grant  execute on function public.link_hostup_domain(text,uuid,text,text,text,timestamptz,boolean,boolean,text[]) to authenticated;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.link_hostup_domain(text,uuid,text,text,text,timestamptz,boolean,boolean,text[]);
-- drop function if exists public.log_hostup_event(text,uuid,text,uuid,text,jsonb);
-- drop index if exists public.idx_domains_unlinked;
-- drop index if exists public.uq_domains_provider_domain;
-- alter table public.domains alter column customer_id set not null;  -- only if no NULL rows
-- alter table public.domains drop column if exists last_synced_at;
-- alter table public.domains drop column if exists provider_order_id;
-- alter table public.domains drop constraint if exists domains_registrar_check;
-- alter table public.domains add constraint domains_registrar_check check (registrar in ('manual','openprovider'));

-- ════════════════════════════════════════════════════════════════════════════
-- Phase 5A · domain_orders registrant contact (forward migration)
--
-- The registrant step (app: registrant-contact.ts + checkout flow) was shipped,
-- but the DB side had been added by editing the already-applied baseline
-- 20260731000002 in place — so it never reached environments where that baseline
-- had already run (registrant_details / get_portal_customer_contact were absent
-- on the deployed DB). 20260731000002 has been restored to its LOCKED original;
-- this ADDITIVE forward migration re-applies the exact same three changes:
--
--   1. domain_orders.registrant_details jsonb (NOT NULL default '{}')
--   2. create_domain_order — trailing p_registrant_details arg + insert
--   3. get_portal_customer_contact(uuid) — own-contact prefill for checkout
--
-- Idempotent (add column if not exists / create or replace / drop if exists), so
-- it is safe on a DB that already ran the in-place edit AND on a clean baseline.
-- No RLS is weakened; no USING(true) policy; grants match the baseline pattern.
--
-- PII: registrant_details is customer contact data. It is written ONLY via
-- create_domain_order (no client write path), never selected into a customer
-- DTO (ORDER_COLUMNS excludes it), and never logged/audited. The existing
-- domain_orders_select RLS scopes reads to the owning customer + admin.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. registrant_details column ─────────────────────────────────────────────
alter table public.domain_orders
  add column if not exists registrant_details jsonb not null default '{}'::jsonb;

alter table public.domain_orders
  drop constraint if exists domain_orders_registrant_details_object;
alter table public.domain_orders
  add constraint domain_orders_registrant_details_object
  check (jsonb_typeof(registrant_details) = 'object');

comment on column public.domain_orders.registrant_details is
  'Registrant contact captured at checkout (pre-filled from the customer''s existing details, missing fields completed by the customer). Customer PII — RLS-protected, written only via create_domain_order, never selected into a customer DTO, never logged, NEVER sent to Hostup in this phase.';

-- ── 2. create_domain_order + p_registrant_details ────────────────────────────
-- Adding a DEFAULTed arg would create a second overload (PostgREST ambiguity),
-- so drop the 10-arg signature and recreate. Body matches 20260731000002 plus
-- the registrant_details insert.
drop function if exists public.create_domain_order(
  text,text,integer,integer,integer,integer,integer,jsonb,text,uuid);

create or replace function public.create_domain_order(
    p_domain_name text,
    p_operation text,
    p_years integer,
    p_net_amount_minor integer,
    p_vat_amount_minor integer,
    p_gross_amount_minor integer,
    p_vat_rate_basis_points integer default null,
    p_quote_snapshot jsonb default '{}'::jsonb,
    p_currency_code text default 'SEK',
    p_customer_id uuid default null,   -- ONLY consulted for admin-in-customer-view
    p_registrant_details jsonb default '{}'::jsonb)
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_admin boolean := public.is_admin();
  v_customer_id uuid;
  v_id uuid;
begin
  if v_is_admin then
    if p_customer_id is null then raise exception 'customer_id required for admin.'; end if;
    if not exists (
      select 1 from public.customers c
      join public.profiles p on p.user_id = c.portal_user_id
      where c.id = p_customer_id and c.archived_at is null
        and p.role = 'customer'
        and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end)
    ) then raise exception 'Target is not an active portal customer.'; end if;
    v_customer_id := p_customer_id;
  else
    -- REAL customer: derive from the session; a client value is ignored.
    select c.id into v_customer_id
      from public.customers c
      join public.profiles p on p.user_id = c.portal_user_id
      where c.portal_user_id = (select auth.uid()) and c.archived_at is null
        and p.role = 'customer'
        and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end);
    if v_customer_id is null then raise exception 'Not an active portal customer.'; end if;
  end if;

  if p_operation not in ('register','renew','transfer') then raise exception 'Invalid operation.'; end if;
  if coalesce(p_years,0) < 1 or p_years > 10 then raise exception 'Invalid years.'; end if;
  if p_net_amount_minor < 0 or p_vat_amount_minor < 0 or p_gross_amount_minor < 0
     or p_gross_amount_minor <> p_net_amount_minor + p_vat_amount_minor then
    raise exception 'Invalid amounts.'; end if;

  if jsonb_typeof(coalesce(p_registrant_details,'{}'::jsonb)) <> 'object' then
    raise exception 'Invalid registrant details.'; end if;

  insert into public.domain_orders(customer_id, domain_name, operation, years,
      currency_code, net_amount_minor, vat_amount_minor, gross_amount_minor,
      vat_rate_basis_points, quote_snapshot, registrant_details, status, created_by)
    values (v_customer_id, lower(btrim(p_domain_name)), p_operation, p_years,
      upper(p_currency_code), p_net_amount_minor, p_vat_amount_minor, p_gross_amount_minor,
      p_vat_rate_basis_points, coalesce(p_quote_snapshot,'{}'::jsonb),
      coalesce(p_registrant_details,'{}'::jsonb), 'DRAFT', (select auth.uid()))
    returning id into v_id;

  return v_id;
end $$;
revoke execute on function public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid,jsonb) from public;
grant  execute on function public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid,jsonb) to authenticated;

-- ── 3. get_portal_customer_contact (own-contact prefill for checkout) ─────────
-- A portal customer is not covered by customers_select RLS (that policy is for
-- CRM owners), so this SECURITY DEFINER function returns ONLY the caller's own
-- contact fields. An admin-in-view passes the viewed customer id.
create or replace function public.get_portal_customer_contact(p_customer_id uuid default null)
  returns table (
    first_name text, last_name text, email text, phone text,
    address text, postal_code text, city text, company_name text,
    org_number text, country text)
  language plpgsql stable security definer set search_path = ''
as $$
begin
  if public.is_admin() then
    if p_customer_id is null then raise exception 'customer_id required for admin.'; end if;
    return query
      select c.first_name, c.last_name, c.email, c.phone, c.address, c.postal_code,
             c.city, c.company_name, c.org_number, c.country
      from public.customers c
      where c.id = p_customer_id and c.archived_at is null;
  else
    return query
      select c.first_name, c.last_name, c.email, c.phone, c.address, c.postal_code,
             c.city, c.company_name, c.org_number, c.country
      from public.customers c
      where c.portal_user_id = (select auth.uid()) and c.archived_at is null;
  end if;
end $$;
revoke execute on function public.get_portal_customer_contact(uuid) from public;
grant  execute on function public.get_portal_customer_contact(uuid) to authenticated;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.get_portal_customer_contact(uuid);
-- drop function if exists public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid,jsonb);
-- -- re-create the 10-arg create_domain_order from 20260731000002.
-- alter table public.domain_orders drop constraint if exists domain_orders_registrant_details_object;
-- alter table public.domain_orders drop column if exists registrant_details;

-- ════════════════════════════════════════════════════════════════════════════
-- Phase 5A · domain_orders (Stripe TEST-mode checkout)
--
-- Local order + payment tracking for a domain purchase. This table ONLY records
-- the customer's order and its Stripe payment state — it does NOT create a Hostup
-- order, invoice, real domain, transfer, or DNS record (that is a later phase).
--
-- MONEY: every *_minor column is an INTEGER in the currency's MINOR unit (öre).
-- Customer sale price ONLY — net / vat / gross. NO provider/purchase price or
-- margin is ever stored or exposed (mirrors domain_pricing_rules invariant).
--
-- Writes never happen from the browser: customers get SELECT (own rows) via RLS;
-- all mutations go through SECURITY DEFINER RPCs — customer-callable for create/
-- attach, and service_role-only for the webhook settlement (idempotent).
--
-- Baselines 20260727..20260731000001 are LOCKED. Additive forward migration only.
-- No RLS is weakened; no USING(true) policy.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── widen log_customer_event allowlist with the checkout actions ─────────────
-- Same signature / security / grants / body as 20260731000000; only the action
-- allowlist grows (established CREATE OR REPLACE pattern).
create or replace function public.log_customer_event(
    p_action text,
    p_domain_id uuid default null,
    p_effective_user_id uuid default null,
    p_outcome text default 'success',
    p_metadata jsonb default '{}'::jsonb)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_is_admin boolean := public.is_admin();
  v_is_customer boolean := exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'customer'
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
begin
  if not (v_is_admin or v_is_customer or v_is_service) then
    raise exception 'Not authorized to log a customer event.';
  end if;

  if p_action not in (
      'CUSTOMER_DOMAIN_LIST_VIEWED','CUSTOMER_DOMAIN_DETAIL_VIEWED',
      'CUSTOMER_DOMAIN_STATUS_REFRESHED','CUSTOMER_DOMAIN_SEARCH_VIEWED',
      'CUSTOMER_DOMAIN_QUOTE_PREPARED',
      -- Phase 5A checkout:
      'CUSTOMER_DOMAIN_CHECKOUT_CREATED','CUSTOMER_DOMAIN_ORDER_PAID',
      'CUSTOMER_DOMAIN_ORDER_FAILED') then
    raise exception 'Invalid customer event action: %', p_action;
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
           'effective_user_id', p_effective_user_id,
           'context', case
                        when v_is_service then 'service'
                        when v_is_admin   then 'customer_view'
                        else 'customer' end)),
    null, null, coalesce(p_outcome,'success'));
end $$;

revoke execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) from public;
grant  execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) to authenticated;
grant  execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) to service_role;

-- ── table ────────────────────────────────────────────────────────────────────
create table if not exists public.domain_orders (
  id uuid primary key default gen_random_uuid(),

  -- Ownership anchor: same as the domains table (customers.id → portal_user_id).
  customer_id uuid not null references public.customers(id),

  domain_name text not null
    check (domain_name = lower(domain_name)
       and char_length(domain_name) between 1 and 253),
  operation text not null check (operation in ('register','renew','transfer')),
  years integer not null default 1 check (years >= 1 and years <= 10),

  -- Customer sale price. INTEGER MINOR units (öre). NO provider price/margin.
  currency_code text not null default 'SEK'
    check (char_length(currency_code) = 3 and currency_code = upper(currency_code)),
  net_amount_minor   integer not null check (net_amount_minor   >= 0),  -- ex-VAT
  vat_amount_minor   integer not null check (vat_amount_minor   >= 0),
  gross_amount_minor integer not null check (gross_amount_minor >= 0),
  vat_rate_basis_points integer check (vat_rate_basis_points is null or vat_rate_basis_points >= 0),
  constraint domain_orders_gross_sum check (gross_amount_minor = net_amount_minor + vat_amount_minor),

  -- Frozen customer-safe quote (net/vat/gross/currency/tld/operation/years).
  -- MUST NOT contain a provider price. Redacted on any audit write.
  quote_snapshot jsonb not null default '{}'::jsonb,

  status text not null default 'DRAFT'
    check (status in ('DRAFT','CHECKOUT_CREATED','PAID_AWAITING_REGISTRATION',
                      'PAYMENT_FAILED','EXPIRED','CANCELLED')),

  stripe_session_id text,          -- Stripe Checkout Session (test mode)
  stripe_payment_intent_id text,   -- set when paid; internal reconciliation key only

  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  paid_at    timestamptz
);

comment on table public.domain_orders is
  'Local domain checkout order + Stripe payment tracking. Amounts INTEGER MINOR units (öre). Customer net/vat/gross only — NO provider price/margin. No Hostup order is created here.';

create index if not exists idx_domain_orders_customer on public.domain_orders (customer_id);
create index if not exists idx_domain_orders_status   on public.domain_orders (status);
-- Partial unique: one order per Stripe session (webhook idempotency anchor).
create unique index if not exists uq_domain_orders_stripe_session
  on public.domain_orders (stripe_session_id) where stripe_session_id is not null;

drop trigger if exists trg_domain_orders_updated_at on public.domain_orders;
create trigger trg_domain_orders_updated_at before update on public.domain_orders
  for each row execute function public.update_updated_at_column();

-- ── RLS: customer/admin SELECT own; NO client writes ─────────────────────────
alter table public.domain_orders enable row level security;
revoke all on public.domain_orders from anon, authenticated;
grant  select on table public.domain_orders to authenticated;

drop policy if exists domain_orders_select on public.domain_orders;
create policy domain_orders_select on public.domain_orders for select to authenticated
  using (public.is_admin()
         or (public.is_active_user() and public.is_portal_customer_of(customer_id)));
-- No insert/update/delete policy → every write goes through the RPCs below.

-- ── create order (customer-callable; server-derived customer_id) ─────────────
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
    p_customer_id uuid default null)   -- ONLY consulted for admin-in-customer-view
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

  insert into public.domain_orders(customer_id, domain_name, operation, years,
      currency_code, net_amount_minor, vat_amount_minor, gross_amount_minor,
      vat_rate_basis_points, quote_snapshot, status, created_by)
    values (v_customer_id, lower(btrim(p_domain_name)), p_operation, p_years,
      upper(p_currency_code), p_net_amount_minor, p_vat_amount_minor, p_gross_amount_minor,
      p_vat_rate_basis_points, coalesce(p_quote_snapshot,'{}'::jsonb), 'DRAFT', (select auth.uid()))
    returning id into v_id;

  return v_id;
end $$;
revoke execute on function public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid) from public;
grant  execute on function public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid) to authenticated;

-- ── attach a Stripe session (customer-callable; own order; DRAFT→CHECKOUT) ───
create or replace function public.attach_domain_order_checkout(
    p_order_id uuid, p_session_id text)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare v_customer_id uuid; v_status text;
begin
  if p_session_id is null or btrim(p_session_id) = '' then raise exception 'session id required.'; end if;
  select customer_id, status into v_customer_id, v_status
    from public.domain_orders where id = p_order_id for update;
  if v_customer_id is null then raise exception 'Order not found.'; end if;
  -- Ownership: caller must be admin or the portal customer that owns the order.
  if not (public.is_admin() or public.is_portal_customer_of(v_customer_id)) then
    raise exception 'Not authorized for this order.';
  end if;
  if v_status <> 'DRAFT' then return; end if;  -- idempotent / already advanced
  update public.domain_orders
     set status = 'CHECKOUT_CREATED', stripe_session_id = p_session_id
   where id = p_order_id;
end $$;
revoke execute on function public.attach_domain_order_checkout(uuid,text) from public;
grant  execute on function public.attach_domain_order_checkout(uuid,text) to authenticated;

-- ── webhook: mark paid (service_role only; idempotent) ───────────────────────
create or replace function public.mark_domain_order_paid(
    p_session_id text, p_payment_intent_id text)
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_id uuid; v_status text;
begin
  if not v_is_service then raise exception 'Only the service role can settle an order.'; end if;
  select id, status into v_id, v_status
    from public.domain_orders where stripe_session_id = p_session_id for update;
  if v_id is null then raise exception 'Order not found for session.'; end if;
  -- Idempotent: only advance from a pre-payment state; re-delivery is a no-op.
  if v_status in ('DRAFT','CHECKOUT_CREATED') then
    update public.domain_orders
       set status = 'PAID_AWAITING_REGISTRATION',
           paid_at = now(),
           stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id)
     where id = v_id;
  end if;
  return v_id;
end $$;
revoke execute on function public.mark_domain_order_paid(text,text) from public;
grant  execute on function public.mark_domain_order_paid(text,text) to service_role;

-- ── webhook: mark failed / expired / cancelled (service_role only; idempotent) ─
create or replace function public.mark_domain_order_terminal(
    p_session_id text, p_status text)
  returns uuid
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_id uuid; v_status text;
begin
  if not v_is_service then raise exception 'Only the service role can update an order.'; end if;
  if p_status not in ('PAYMENT_FAILED','EXPIRED','CANCELLED') then raise exception 'Invalid terminal status.'; end if;
  select id, status into v_id, v_status
    from public.domain_orders where stripe_session_id = p_session_id for update;
  if v_id is null then raise exception 'Order not found for session.'; end if;
  -- Never override a successful payment; only fail/expire/cancel a pending order.
  if v_status in ('DRAFT','CHECKOUT_CREATED') then
    update public.domain_orders set status = p_status where id = v_id;
  end if;
  return v_id;
end $$;
revoke execute on function public.mark_domain_order_terminal(text,text) from public;
grant  execute on function public.mark_domain_order_terminal(text,text) to service_role;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.mark_domain_order_terminal(text,text);
-- drop function if exists public.mark_domain_order_paid(text,text);
-- drop function if exists public.attach_domain_order_checkout(uuid,text);
-- drop function if exists public.create_domain_order(text,text,integer,integer,integer,integer,integer,jsonb,text,uuid);
-- drop table if exists public.domain_orders;
-- -- re-apply 20260731000000 log_customer_event to drop the checkout actions.

-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3B · Intennze domain pricing rules
--
-- Admin-configurable CUSTOMER sale prices layered on top of Hostup PROVIDER
-- (purchase) prices. Provider price / margin are NEVER exposed to a customer:
--   · the rule table holds NO provider cost (provider price is Hostup-live only);
--   · customers have NO direct RLS access to the table;
--   · the pricing calc reads rule config through a SECURITY DEFINER function and
--     the customer response is mapped to a safe DTO server-side.
--
-- MONEY UNIT: every *_minor column is an INTEGER in the currency's MINOR unit
-- (öre for SEK) — deliberately DIFFERENT from invoices.amount (whole kronor) and
-- the numeric(10,2) amounts elsewhere. Never mix. 19900 minor = 199,00 kr.
--
-- Baselines 20260727/20260728/20260729 are LOCKED — this is a NEW forward
-- migration. Additive only. No real production prices are inserted.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── audit: widen log_hostup_event allowlist with the pricing actions ─────────
-- Same signature / security / grants / body as 20260729000000; only the action
-- allowlist grows (established, safe CREATE OR REPLACE pattern).
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

  if p_action not in (
      'HOSTUP_DOMAIN_SYNCED','HOSTUP_DOMAIN_LINKED_TO_CUSTOMER','HOSTUP_SYNC_FAILED',
      'DOMAIN_AVAILABILITY_CHECKED','DOMAIN_BULK_AVAILABILITY_CHECKED','DOMAIN_ORDER_PREVIEWED',
      'HOSTUP_AVAILABILITY_FAILED','HOSTUP_ORDER_PREVIEW_FAILED',
      -- Phase 3B pricing rules:
      'DOMAIN_PRICING_RULE_CREATED','DOMAIN_PRICING_RULE_UPDATED',
      'DOMAIN_PRICING_RULE_ACTIVATED','DOMAIN_PRICING_RULE_DEACTIVATED',
      'DOMAIN_PRICE_PREVIEWED') then
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

-- ── table ────────────────────────────────────────────────────────────────────
create table if not exists public.domain_pricing_rules (
  id uuid primary key default gen_random_uuid(),
  -- NULL tld = default/fallback rule for the operation. Store bare, lowercase.
  tld text,
  operation text not null check (operation in ('register','renew','transfer')),
  calculation_type text not null
    check (calculation_type in ('fixed','fixed_markup','percentage_markup','fixed_and_percentage')),

  -- INTEGER MINOR UNITS (öre). NOT whole kronor.
  fixed_customer_price_minor     bigint  check (fixed_customer_price_minor     is null or fixed_customer_price_minor     >= 0),
  -- FIXED prices are period-scoped; the fixed price covers exactly this many years
  -- (default 1). The engine REJECTS other periods — it never multiplies a fixed price.
  fixed_price_years              integer check (fixed_price_years is null or fixed_price_years >= 1),
  markup_fixed_minor             bigint  check (markup_fixed_minor             is null or markup_fixed_minor             >= 0),
  markup_percentage_basis_points integer check (markup_percentage_basis_points is null or markup_percentage_basis_points >= 0),
  minimum_customer_price_minor   bigint  check (minimum_customer_price_minor   is null or minimum_customer_price_minor   >= 0),

  currency_code text not null default 'SEK' check (char_length(currency_code) = 3 and currency_code = upper(currency_code)),
  -- A normal rule NEVER prices a premium domain. Premium requires an explicit rule.
  applies_to_premium boolean not null default false,

  is_active boolean not null default true,
  -- Validity window (instants). Both nullable = "always". Half-open [starts_at, ends_at).
  starts_at timestamptz,
  ends_at   timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id),

  constraint dpr_valid_window check (starts_at is null or ends_at is null or ends_at > starts_at),
  -- Each calc type must carry the inputs it needs (defense in depth vs. the RPCs).
  constraint dpr_fixed_needs_price check (
    calculation_type <> 'fixed' or fixed_customer_price_minor is not null),
  constraint dpr_pct_needs_bp check (
    calculation_type not in ('percentage_markup','fixed_and_percentage')
    or markup_percentage_basis_points is not null),
  constraint dpr_fixedmarkup_needs_fixed check (
    calculation_type not in ('fixed_markup','fixed_and_percentage')
    or markup_fixed_minor is not null)
);

comment on table  public.domain_pricing_rules is 'Intennze customer sale-price rules for domains. Amounts are integer MINOR units (öre). Holds no provider cost; provider price is Hostup-live only.';
comment on column public.domain_pricing_rules.tld is 'Bare lowercase TLD (no leading dot). NULL = default rule for the operation.';
comment on column public.domain_pricing_rules.fixed_price_years is 'Years the FIXED price covers (default 1). Other periods are rejected — never multiplied.';

create index if not exists idx_dpr_lookup on public.domain_pricing_rules (operation, currency_code, tld) where is_active;
-- At most one STANDING (open-ended) active rule per key. Dated overlaps are
-- caught by the RPC overlap guard below (no btree_gist dependency introduced).
create unique index if not exists uq_dpr_active_open
  on public.domain_pricing_rules (operation, currency_code, coalesce(tld,''), applies_to_premium)
  where is_active and ends_at is null;

drop trigger if exists trg_dpr_updated_at on public.domain_pricing_rules;
create trigger trg_dpr_updated_at before update on public.domain_pricing_rules
  for each row execute function public.update_updated_at_column();

-- ── RLS: default-deny; admins may READ for the management UI; NO write policy ─
alter table public.domain_pricing_rules enable row level security;
revoke all on public.domain_pricing_rules from anon, authenticated;

drop policy if exists dpr_admin_select on public.domain_pricing_rules;
create policy dpr_admin_select on public.domain_pricing_rules for select to authenticated
  using (public.is_admin());
-- No insert/update/delete policy → all writes go through the SECURITY DEFINER RPCs.
-- No customer policy at all → a customer can never read rule config or margin.

-- ── read active rule CONFIG for the calc (no provider price, never margin) ───
-- Returns exact-tld + default(tld null) active rules for (operation, currency)
-- valid at p_at. The server resolves exact > default. Callable by authenticated
-- (the calc runs server-side under the caller's session); the returned config
-- alone cannot reconstruct a margin because the customer never receives the
-- provider price.
-- All filter params are OPTIONAL (NULL = no filter) so the server can load every
-- active rule for a currency in ONE call and resolve exact>default in-memory. A
-- non-null p_tld returns that TLD's exact rules PLUS the default (tld null) rules.
create or replace function public.get_active_domain_pricing_rules(
    p_currency text default 'SEK',
    p_operation text default null,
    p_tld text default null,
    p_premium boolean default null,
    p_at timestamptz default now())
  returns table (
    id uuid, tld text, operation text, calculation_type text,
    fixed_customer_price_minor bigint, fixed_price_years integer,
    markup_fixed_minor bigint, markup_percentage_basis_points integer,
    minimum_customer_price_minor bigint, currency_code text, applies_to_premium boolean)
  language sql stable security definer set search_path = ''
as $$
  select r.id, r.tld, r.operation, r.calculation_type,
         r.fixed_customer_price_minor, r.fixed_price_years,
         r.markup_fixed_minor, r.markup_percentage_basis_points,
         r.minimum_customer_price_minor, r.currency_code, r.applies_to_premium
  from public.domain_pricing_rules r
  where r.is_active
    and r.currency_code = upper(p_currency)
    and (p_operation is null or r.operation = p_operation)
    and (p_premium   is null or r.applies_to_premium = p_premium)
    and (p_tld is null or r.tld is null or r.tld = nullif(lower(btrim(p_tld)), ''))
    and (r.starts_at is null or r.starts_at <= p_at)
    and (r.ends_at   is null or r.ends_at   >  p_at);
$$;
revoke execute on function public.get_active_domain_pricing_rules(text,text,text,boolean,timestamptz) from public;
grant  execute on function public.get_active_domain_pricing_rules(text,text,text,boolean,timestamptz) to authenticated, service_role;

-- ── admin CRUD RPCs (SECURITY DEFINER; assert is_admin; overlap-guarded) ─────
create or replace function public.create_domain_pricing_rule(
    p_operation text, p_calculation_type text, p_tld text default null,
    p_fixed_customer_price_minor bigint default null, p_fixed_price_years integer default null,
    p_markup_fixed_minor bigint default null, p_markup_percentage_basis_points integer default null,
    p_minimum_customer_price_minor bigint default null,
    p_currency_code text default 'SEK', p_applies_to_premium boolean default false,
    p_starts_at timestamptz default null, p_ends_at timestamptz default null)
  returns uuid language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_tld text := nullif(lower(btrim(p_tld)), ''); v_cur text := upper(p_currency_code);
begin
  if not public.is_admin() then raise exception 'Only an admin can manage pricing rules.'; end if;

  -- Deny overlapping ACTIVE windows for the same (tld, operation, currency, premium).
  if exists (select 1 from public.domain_pricing_rules r
      where r.is_active and r.operation = p_operation and r.currency_code = v_cur
        and r.applies_to_premium = coalesce(p_applies_to_premium, false)
        and r.tld is not distinct from v_tld
        and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) then
    raise exception 'An active rule already overlaps this window for (tld, operation, currency).';
  end if;

  insert into public.domain_pricing_rules(operation, calculation_type, tld,
      fixed_customer_price_minor, fixed_price_years, markup_fixed_minor,
      markup_percentage_basis_points, minimum_customer_price_minor,
      currency_code, applies_to_premium, starts_at, ends_at, created_by, updated_by)
    values (p_operation, p_calculation_type, v_tld,
      p_fixed_customer_price_minor, p_fixed_price_years, p_markup_fixed_minor,
      p_markup_percentage_basis_points, p_minimum_customer_price_minor,
      v_cur, coalesce(p_applies_to_premium,false), p_starts_at, p_ends_at,
      (select auth.uid()), (select auth.uid()))
    returning id into v_id;

  perform public.log_hostup_event('DOMAIN_PRICING_RULE_CREATED', null, null, null, 'success',
    jsonb_build_object('rule_id', v_id, 'tld', v_tld, 'operation', p_operation, 'calculation_type', p_calculation_type));
  return v_id;
end $$;
revoke execute on function public.create_domain_pricing_rule(text,text,text,bigint,integer,bigint,integer,bigint,text,boolean,timestamptz,timestamptz) from public;
grant  execute on function public.create_domain_pricing_rule(text,text,text,bigint,integer,bigint,integer,bigint,text,boolean,timestamptz,timestamptz) to authenticated;

create or replace function public.update_domain_pricing_rule(
    p_id uuid, p_calculation_type text,
    p_fixed_customer_price_minor bigint default null, p_fixed_price_years integer default null,
    p_markup_fixed_minor bigint default null, p_markup_percentage_basis_points integer default null,
    p_minimum_customer_price_minor bigint default null,
    p_starts_at timestamptz default null, p_ends_at timestamptz default null)
  returns void language plpgsql security definer set search_path = ''
as $$
declare v_rule public.domain_pricing_rules%rowtype; v_changed text[] := '{}';
begin
  if not public.is_admin() then raise exception 'Only an admin can manage pricing rules.'; end if;
  select * into v_rule from public.domain_pricing_rules where id = p_id for update;
  if not found then raise exception 'Pricing rule not found.'; end if;

  -- Re-check overlap only against OTHER active rules (exclude self).
  if v_rule.is_active and exists (select 1 from public.domain_pricing_rules r
      where r.id <> p_id and r.is_active and r.operation = v_rule.operation
        and r.currency_code = v_rule.currency_code
        and r.applies_to_premium = v_rule.applies_to_premium
        and r.tld is not distinct from v_rule.tld
        and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(p_starts_at, p_ends_at, '[)')) then
    raise exception 'An active rule already overlaps this window for (tld, operation, currency).';
  end if;

  update public.domain_pricing_rules
     set calculation_type = p_calculation_type,
         fixed_customer_price_minor = p_fixed_customer_price_minor,
         fixed_price_years = p_fixed_price_years,
         markup_fixed_minor = p_markup_fixed_minor,
         markup_percentage_basis_points = p_markup_percentage_basis_points,
         minimum_customer_price_minor = p_minimum_customer_price_minor,
         starts_at = p_starts_at, ends_at = p_ends_at,
         updated_by = (select auth.uid())
   where id = p_id;

  perform public.log_hostup_event('DOMAIN_PRICING_RULE_UPDATED', null, null, null, 'success',
    jsonb_build_object('rule_id', p_id, 'operation', v_rule.operation, 'calculation_type', p_calculation_type));
end $$;
revoke execute on function public.update_domain_pricing_rule(uuid,text,bigint,integer,bigint,integer,bigint,timestamptz,timestamptz) from public;
grant  execute on function public.update_domain_pricing_rule(uuid,text,bigint,integer,bigint,integer,bigint,timestamptz,timestamptz) to authenticated;

create or replace function public.set_domain_pricing_rule_active(p_id uuid, p_active boolean)
  returns void language plpgsql security definer set search_path = ''
as $$
declare v_rule public.domain_pricing_rules%rowtype;
begin
  if not public.is_admin() then raise exception 'Only an admin can manage pricing rules.'; end if;
  select * into v_rule from public.domain_pricing_rules where id = p_id for update;
  if not found then raise exception 'Pricing rule not found.'; end if;

  -- Activating: ensure it does not overlap another active rule.
  if p_active and not v_rule.is_active and exists (select 1 from public.domain_pricing_rules r
      where r.id <> p_id and r.is_active and r.operation = v_rule.operation
        and r.currency_code = v_rule.currency_code
        and r.applies_to_premium = v_rule.applies_to_premium
        and r.tld is not distinct from v_rule.tld
        and tstzrange(r.starts_at, r.ends_at, '[)') && tstzrange(v_rule.starts_at, v_rule.ends_at, '[)')) then
    raise exception 'Activating this rule would overlap another active rule.';
  end if;

  update public.domain_pricing_rules set is_active = p_active, updated_by = (select auth.uid()) where id = p_id;

  perform public.log_hostup_event(
    case when p_active then 'DOMAIN_PRICING_RULE_ACTIVATED' else 'DOMAIN_PRICING_RULE_DEACTIVATED' end,
    null, null, null, 'success', jsonb_build_object('rule_id', p_id, 'operation', v_rule.operation));
end $$;
revoke execute on function public.set_domain_pricing_rule_active(uuid,boolean) from public;
grant  execute on function public.set_domain_pricing_rule_active(uuid,boolean) to authenticated;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.set_domain_pricing_rule_active(uuid,boolean);
-- drop function if exists public.update_domain_pricing_rule(uuid,text,bigint,integer,bigint,integer,bigint,timestamptz,timestamptz);
-- drop function if exists public.create_domain_pricing_rule(text,text,text,bigint,integer,bigint,integer,bigint,text,boolean,timestamptz,timestamptz);
-- drop function if exists public.get_active_domain_pricing_rules(text,text,text,boolean,timestamptz);
-- drop table if exists public.domain_pricing_rules;
-- -- re-apply 20260729000000 log_hostup_event to drop the pricing actions.

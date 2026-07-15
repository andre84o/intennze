-- ════════════════════════════════════════════════════════════════════════════
-- COMMISSION v1.2 · Per-salesperson commission ladder + base salary (ADDITIVE)
--   Each salesperson gets their OWN commission ladder (editable thresholds +
--   rates) instead of the single global commission_tiers. An optional base
--   salary is stored per person for ADMIN REFERENCE ONLY — never shown to the
--   salesperson, never counted in any sales/commission figure.
--
--   The global commission_tiers stays as the FALLBACK for anyone without a
--   personal ladder, so nothing breaks for existing periods.
--
-- Depends on 20260714150000 + 20260714150500 (+ 20260714160000).
-- ════════════════════════════════════════════════════════════════════════════

-- ── Per-salesperson ladder ─────────────────────────────────────────────────
-- One set of rows per salesperson. max_revenue_ex_vat is DISPLAY/next-tier only
-- (rate selection uses "highest min_revenue_ex_vat <= revenue"), so overlapping
-- or +1-gap boundaries (0–50000, 50001–100000, …) both work correctly.
create table if not exists public.salesperson_commission_tiers (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users(id) on delete cascade,
  sort_order          int  not null,
  min_revenue_ex_vat  numeric(14,2) not null,
  max_revenue_ex_vat  numeric(14,2),
  rate_percent        numeric(5,2)  not null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  constraint scti_min_nonneg   check (min_revenue_ex_vat >= 0),
  constraint scti_range_valid  check (max_revenue_ex_vat is null or max_revenue_ex_vat >= min_revenue_ex_vat),
  constraint scti_rate_range   check (rate_percent >= 0 and rate_percent <= 100),
  unique (user_id, sort_order)
);
create index if not exists scti_user_min_idx
  on public.salesperson_commission_tiers (user_id, min_revenue_ex_vat);

-- ── Per-salesperson settings (base salary — admin-only reference) ───────────
create table if not exists public.salesperson_commission_settings (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  base_salary numeric(12,2),                    -- nullable: many sellers are commission-only
  updated_at  timestamptz not null default now(),
  updated_by  uuid,
  constraint scs_base_salary_nonneg check (base_salary is null or base_salary >= 0)
);

-- ── RLS: ADMIN-ONLY on both tables ─────────────────────────────────────────
-- Salespeople never read their ladder/base salary directly; the rate is baked
-- into the period snapshot, and "kvar till nästa nivå" comes via a guarded
-- SECURITY DEFINER helper. Base salary stays entirely admin-side.
alter table public.salesperson_commission_tiers    enable row level security;
alter table public.salesperson_commission_settings enable row level security;

drop policy if exists scti_admin_all on public.salesperson_commission_tiers;
create policy scti_admin_all on public.salesperson_commission_tiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists scs_admin_all on public.salesperson_commission_settings;
create policy scs_admin_all on public.salesperson_commission_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Table privileges (RLS still gates to admins). Mirrors commission_tiers grant.
grant select, insert, update, delete on public.salesperson_commission_tiers    to authenticated;
grant select, insert, update, delete on public.salesperson_commission_settings to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- commission_rate_for(user, revenue) — the applicable rate for a salesperson at
--   a given monthly revenue. Uses the salesperson's OWN ladder when they have
--   one (highest min_revenue_ex_vat <= revenue); else falls back to the global
--   commission_tiers. SECURITY DEFINER so it can read the admin-only ladder from
--   inside the (caller-rights) figures function.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.commission_rate_for(p_user_id uuid, p_revenue numeric)
  returns numeric
  language sql stable security definer set search_path = '' as $$
  select (case
    when exists (select 1 from public.salesperson_commission_tiers t where t.user_id = p_user_id)
    then coalesce((
      select t.rate_percent from public.salesperson_commission_tiers t
        where t.user_id = p_user_id and p_revenue >= t.min_revenue_ex_vat
        order by t.min_revenue_ex_vat desc limit 1), 0)
    else coalesce((
      select ct.rate_percent from public.commission_tiers ct
        where ct.effective_to is null and p_revenue >= ct.min_revenue_ex_vat
          and (ct.max_revenue_ex_vat is null or p_revenue < ct.max_revenue_ex_vat)
        order by ct.sort_order limit 1), 0)
  end)::numeric(5,2);
$$;
revoke execute on function public.commission_rate_for(uuid, numeric) from public, anon;
grant  execute on function public.commission_rate_for(uuid, numeric) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- commission_next_tier_gap(user, revenue) — kronor left until the salesperson's
--   NEXT ladder threshold (null at the top). Self-or-admin guarded so a
--   salesperson can compute their own "kvar till nästa nivå" without reading the
--   admin-only ladder table directly.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.commission_next_tier_gap(p_user_id uuid, p_revenue numeric)
  returns numeric
  language plpgsql stable security definer set search_path = '' as $$
declare
  v_next numeric(14,2);
  v_has  boolean;
begin
  if not (public.is_admin() or p_user_id = (select auth.uid())) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  select exists(select 1 from public.salesperson_commission_tiers t where t.user_id = p_user_id) into v_has;

  if v_has then
    select min(t.min_revenue_ex_vat) into v_next
      from public.salesperson_commission_tiers t
      where t.user_id = p_user_id and t.min_revenue_ex_vat > p_revenue;
  else
    select min(ct.min_revenue_ex_vat) into v_next
      from public.commission_tiers ct
      where ct.effective_to is null and ct.min_revenue_ex_vat > p_revenue;
  end if;

  if v_next is null then
    return null;              -- already at (or above) the top tier
  end if;
  return (v_next - p_revenue)::numeric(14,2);
end $$;
revoke execute on function public.commission_next_tier_gap(uuid, numeric) from public, anon;
grant  execute on function public.commission_next_tier_gap(uuid, numeric) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Re-point the two money functions at the per-salesperson rate. Everything else
-- (revenue sum, earned = revenue*rate/100, adjustments, final) is unchanged.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.approve_commission_period(p_period_id uuid)
  returns json
  language plpgsql security definer set search_path = '' as $$
declare
  v_period      public.commission_periods%rowtype;
  v_revenue     numeric(14,2);
  v_rate        numeric(5,2);
  v_earned      numeric(14,2);
  v_adjustments numeric(14,2);
  v_final       numeric(14,2);
begin
  if not public.is_admin() then
    raise exception 'Only an admin can approve a commission period.' using errcode = '42501';
  end if;

  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.status <> 'open' then
    raise exception 'Period is already % and cannot be approved.', v_period.status using errcode = 'P0001';
  end if;

  select coalesce(sum(ce.amount_ex_vat_snapshot), 0)::numeric(14,2) into v_revenue
    from public.commission_entries ce
    where ce.user_id = v_period.user_id and ce.period_start = v_period.period_start;

  select coalesce(sum(ca.amount), 0)::numeric(14,2) into v_adjustments
    from public.commission_adjustments ca where ca.period_id = v_period.id;

  -- Per-salesperson rate (falls back to global commission_tiers when unset).
  v_rate   := public.commission_rate_for(v_period.user_id, v_revenue);
  v_earned := round(v_revenue * v_rate / 100, 2);
  v_final  := v_earned + v_adjustments;

  update public.commission_periods
     set status = 'approved', revenue_ex_vat_snapshot = v_revenue,
         tier_rate_percent_snapshot = v_rate, earned_commission_snapshot = v_earned,
         adjustments_snapshot = v_adjustments, final_commission_snapshot = v_final,
         approved_at = now(), approved_by = (select auth.uid())
   where id = v_period.id;

  perform public.log_audit('commission_period.approve', 'commission_periods', v_period.id::text,
    v_period.user_id::text || ' ' || v_period.period_start::text,
    jsonb_build_object('status', v_period.status),
    jsonb_build_object('status','approved','revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate,
      'earned', v_earned, 'adjustments', v_adjustments, 'final', v_final),
    null, null, 'success');

  return json_build_object('period', v_period.id, 'status', 'approved',
    'revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate, 'earned_commission', v_earned,
    'adjustments', v_adjustments, 'final_commission', v_final);
end $$;
revoke execute on function public.approve_commission_period(uuid) from public, anon;
grant  execute on function public.approve_commission_period(uuid) to authenticated;

create or replace function public.get_commission_period_figures(p_period_id uuid)
  returns json
  language plpgsql stable set search_path = '' as $$
declare
  v_period  public.commission_periods%rowtype;
  v_revenue numeric(14,2);
  v_rate    numeric(5,2);
  v_earned  numeric(14,2);
  v_adj     numeric(14,2);
  v_final   numeric(14,2);
begin
  select * into v_period from public.commission_periods where id = p_period_id;
  if not found then
    return null;   -- RLS-hidden or nonexistent
  end if;

  if v_period.status <> 'open' then
    return json_build_object('period', v_period.id, 'user_id', v_period.user_id,
      'period_start', v_period.period_start, 'status', v_period.status, 'dynamic', false,
      'revenue_ex_vat', v_period.revenue_ex_vat_snapshot, 'tier_rate_percent', v_period.tier_rate_percent_snapshot,
      'earned_commission', v_period.earned_commission_snapshot, 'adjustments', v_period.adjustments_snapshot,
      'final_commission', v_period.final_commission_snapshot);
  end if;

  select coalesce(sum(ce.amount_ex_vat_snapshot), 0)::numeric(14,2) into v_revenue
    from public.commission_entries ce
    where ce.user_id = v_period.user_id and ce.period_start = v_period.period_start;
  select coalesce(sum(ca.amount), 0)::numeric(14,2) into v_adj
    from public.commission_adjustments ca where ca.period_id = v_period.id;

  v_rate   := public.commission_rate_for(v_period.user_id, v_revenue);
  v_earned := round(v_revenue * v_rate / 100, 2);
  v_final  := v_earned + v_adj;

  return json_build_object('period', v_period.id, 'user_id', v_period.user_id,
    'period_start', v_period.period_start, 'status', v_period.status, 'dynamic', true,
    'revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate, 'earned_commission', v_earned,
    'adjustments', v_adj, 'final_commission', v_final);
end $$;
revoke execute on function public.get_commission_period_figures(uuid) from public, anon;
grant  execute on function public.get_commission_period_figures(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- End per-salesperson commission migration.
-- ════════════════════════════════════════════════════════════════════════════

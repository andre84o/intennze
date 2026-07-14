-- ════════════════════════════════════════════════════════════════════════════
-- COMMISSION SYSTEM v1 · Schema foundation (ADDITIVE ONLY)
--   commission_tiers · commission_entries · commission_periods · commission_adjustments
--
-- Depends on Release A/B: public.profiles, public.is_admin(), public.is_active_user(),
--   public.log_audit(), public.update_updated_at_column().
-- RLS is ENABLED here; the POLICIES + the 4 RPCs + invoices.salesperson_user_id
--   live in the companion migration 20260714150500_commission_system_v1_rpcs_rls.sql.
--
-- Money model (locked): invoices.amount/vat_amount/total are WHOLE-KRONOR integers
--   (verified: the app formats them as SEK with no /100). `amount` IS the ex-VAT net.
--   The commission layer stores numeric(14,2) KRONOR because commission =
--   revenue * rate/100 introduces öre (e.g. 49 999 * 15% = 7 499.85). numeric is
--   exact (no float). Widening integer kronor → numeric(14,2) is lossless.
--   revenue_ex_vat = sum(invoices.amount); commission = round(revenue*rate/100, 2).
-- ════════════════════════════════════════════════════════════════════════════

-- ── shared immutability guard for append-only tables (mirrors audit_immutable) ─
create or replace function public.commission_immutable() returns trigger
  language plpgsql set search_path = '' as $$
begin
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end $$;
revoke execute on function public.commission_immutable() from public;

-- ════════════════════════════════════════════════════════════════════════════
-- 1) commission_tiers  (revenue→rate lookup; kronor; admin-managed; versioned)
--    Intended access (policies in companion migration): SELECT to active users;
--    INSERT/UPDATE/DELETE admin-only. Half-open ranges [min, max); top max NULL.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.commission_tiers (
  id                  uuid primary key default gen_random_uuid(),
  min_revenue_ex_vat  numeric(14,2) not null,
  max_revenue_ex_vat  numeric(14,2),                     -- NULL = open-topped (top tier)
  rate_percent        numeric(5,2)  not null,
  sort_order          integer       not null,
  effective_from      date          not null default (now() at time zone 'Europe/Stockholm')::date,
  effective_to        date,                              -- NULL = currently in effect
  created_at          timestamptz   not null default now(),
  created_by          uuid references auth.users(id),
  constraint commission_tiers_min_nonneg  check (min_revenue_ex_vat >= 0),
  constraint commission_tiers_max_nonneg  check (max_revenue_ex_vat is null or max_revenue_ex_vat >= 0),
  constraint commission_tiers_range_valid check (max_revenue_ex_vat is null or max_revenue_ex_vat > min_revenue_ex_vat),
  constraint commission_tiers_rate_range  check (rate_percent >= 0 and rate_percent <= 100),
  constraint commission_tiers_sort_nonneg check (sort_order >= 0),
  constraint commission_tiers_effdates    check (effective_to is null or effective_to >= effective_from)
);
alter table public.commission_tiers enable row level security;

-- No two ACTIVE tiers may share the same lower boundary or sort_order.
create unique index if not exists uq_commission_tiers_active_min
  on public.commission_tiers (min_revenue_ex_vat) where effective_to is null;
create unique index if not exists uq_commission_tiers_active_sort
  on public.commission_tiers (sort_order) where effective_to is null;
create index if not exists idx_commission_tiers_effective
  on public.commission_tiers (effective_from, effective_to);

comment on table public.commission_tiers is
  'Revenue(ex-VAT, kronor) -> commission-rate tiers. Half-open [min,max); top tier max NULL. Achieved tier applies to the WHOLE month revenue. Admin-managed; versioned via effective_from/to.';

-- ── SEED the 4 fixed tiers (kronor, ex-VAT), idempotent ──────────────────────
--   [0,50000)->15%  [50000,100000)->20%  [100000,150000)->25%  [150000,inf)->30%
insert into public.commission_tiers
  (min_revenue_ex_vat, max_revenue_ex_vat, rate_percent, sort_order)
select v.min_r, v.max_r, v.rate, v.ord
from (values
  (      0.00::numeric,  50000.00::numeric, 15.00::numeric, 1),
  (  50000.00::numeric, 100000.00::numeric, 20.00::numeric, 2),
  ( 100000.00::numeric, 150000.00::numeric, 25.00::numeric, 3),
  ( 150000.00::numeric,          null,      30.00::numeric, 4)
) as v(min_r, max_r, rate, ord)
where not exists (
  select 1 from public.commission_tiers t
  where t.effective_to is null and t.min_revenue_ex_vat = v.min_r);

-- ════════════════════════════════════════════════════════════════════════════
-- 2) commission_entries  (one immutable row per commissionable paid invoice)
--    Written ONLY by confirm_invoice_paid (SECURITY DEFINER). All financials are
--    snapshots captured at confirm time. user_id = invoices.salesperson_user_id
--    snapshot. No UPDATE/DELETE (trigger).
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.commission_entries (
  id                      uuid primary key default gen_random_uuid(),
  invoice_id              uuid not null unique references public.invoices(id),
  user_id                 uuid not null references auth.users(id),
  period_start            date not null,
  paid_at_snapshot        timestamptz   not null,
  amount_ex_vat_snapshot  numeric(14,2) not null,
  vat_amount_snapshot     numeric(14,2) not null,
  total_snapshot          numeric(14,2) not null,
  invoice_number_snapshot integer       not null,
  customer_id             uuid not null references public.customers(id),
  created_at              timestamptz   not null default now(),
  created_by              uuid references auth.users(id),
  constraint commission_entries_period_is_month_start
    check (period_start = date_trunc('month', period_start)::date)
);
alter table public.commission_entries enable row level security;

create index if not exists idx_commission_entries_user        on public.commission_entries (user_id);
create index if not exists idx_commission_entries_user_period on public.commission_entries (user_id, period_start);
create index if not exists idx_commission_entries_period      on public.commission_entries (period_start);
create index if not exists idx_commission_entries_customer    on public.commission_entries (customer_id);

comment on table public.commission_entries is
  'Immutable per-invoice commission record (exactly one per invoice via UNIQUE invoice_id). Financials are numeric(14,2) kronor snapshots captured at payment-confirm time; never recomputed. No UPDATE/DELETE.';

drop trigger if exists trg_commission_entries_immutable on public.commission_entries;
create trigger trg_commission_entries_immutable
  before update or delete on public.commission_entries
  for each row execute function public.commission_immutable();

-- ════════════════════════════════════════════════════════════════════════════
-- 3) commission_periods  (per-user monthly rollup; open -> approved -> paid)
--    open shows dynamic calc (computed by the app/read fn); approved/paid freeze
--    the snapshots. One-way lifecycle + freeze enforced by protect_commission_period.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.commission_periods (
  id                          uuid primary key default gen_random_uuid(),
  user_id                     uuid not null references auth.users(id),
  period_start                date not null,
  period_end                  date not null,
  timezone                    text not null default 'Europe/Stockholm',
  status                      text not null default 'open'
                                check (status in ('open','approved','paid')),
  revenue_ex_vat_snapshot     numeric(14,2) not null default 0,
  tier_rate_percent_snapshot  numeric(5,2)  not null default 0,
  earned_commission_snapshot  numeric(14,2) not null default 0,
  adjustments_snapshot        numeric(14,2) not null default 0,
  final_commission_snapshot   numeric(14,2) not null default 0,
  approved_at                 timestamptz,
  approved_by                 uuid references auth.users(id),
  paid_at                     timestamptz,
  paid_by                     uuid references auth.users(id),
  created_at                  timestamptz not null default now(),
  created_by                  uuid references auth.users(id),
  updated_at                  timestamptz not null default now(),
  constraint commission_periods_unique_user_period unique (user_id, period_start),
  constraint commission_periods_month_start   check (period_start = date_trunc('month', period_start)::date),
  constraint commission_periods_period_order  check (period_end >= period_start),
  constraint commission_periods_rate_range    check (tier_rate_percent_snapshot >= 0 and tier_rate_percent_snapshot <= 100),
  constraint commission_periods_revenue_nonneg check (revenue_ex_vat_snapshot >= 0),
  constraint commission_periods_status_coh
    check ( (status = 'open'     and approved_at is null and paid_at is null)
         or (status = 'approved' and approved_at is not null and paid_at is null)
         or (status = 'paid'     and approved_at is not null and paid_at is not null) )
);
alter table public.commission_periods enable row level security;

create index if not exists idx_commission_periods_user        on public.commission_periods (user_id);
create index if not exists idx_commission_periods_user_period on public.commission_periods (user_id, period_start);
create index if not exists idx_commission_periods_status      on public.commission_periods (status);

comment on table public.commission_periods is
  'Per-user monthly commission rollup. Lifecycle open->approved->paid (one-way). Once status leaves open, financial snapshots + reverse transitions are frozen. final = earned + adjustments (numeric(14,2) kronor).';

-- lifecycle + freeze guard
create or replace function public.protect_commission_period() returns trigger
  language plpgsql set search_path = '' as $$
begin
  -- identity is never mutable
  if new.user_id is distinct from old.user_id
     or new.period_start is distinct from old.period_start
     or new.period_end is distinct from old.period_end
     or new.created_at is distinct from old.created_at then
    raise exception 'commission_periods identity (user/period/created_at) is immutable.';
  end if;
  -- allowed status transitions only
  if new.status is distinct from old.status then
    if not ( (old.status = 'open'     and new.status = 'approved')
          or (old.status = 'approved' and new.status = 'paid') ) then
      raise exception 'Illegal commission period transition % -> % (allowed: open->approved->paid).',
        old.status, new.status;
    end if;
  end if;
  -- once left 'open', financial snapshots freeze
  if old.status <> 'open' then
    if new.revenue_ex_vat_snapshot     is distinct from old.revenue_ex_vat_snapshot
       or new.tier_rate_percent_snapshot is distinct from old.tier_rate_percent_snapshot
       or new.earned_commission_snapshot is distinct from old.earned_commission_snapshot
       or new.adjustments_snapshot       is distinct from old.adjustments_snapshot
       or new.final_commission_snapshot  is distinct from old.final_commission_snapshot then
      raise exception 'Commission snapshots are frozen once the period is % (no recompute).', old.status;
    end if;
  end if;
  return new;
end $$;
revoke execute on function public.protect_commission_period() from public;

drop trigger if exists trg_commission_periods_lifecycle on public.commission_periods;
create trigger trg_commission_periods_lifecycle
  before update on public.commission_periods
  for each row execute function public.protect_commission_period();

drop trigger if exists trg_commission_periods_updated_at on public.commission_periods;
create trigger trg_commission_periods_updated_at
  before update on public.commission_periods
  for each row execute function public.update_updated_at_column();

-- ════════════════════════════════════════════════════════════════════════════
-- 4) commission_adjustments  (append-only, signed, per period)
--    Written ONLY by create_commission_adjustment (SECURITY DEFINER). No UPDATE/DELETE.
-- ════════════════════════════════════════════════════════════════════════════
create table if not exists public.commission_adjustments (
  id                       uuid primary key default gen_random_uuid(),
  user_id                  uuid not null references auth.users(id),
  period_id                uuid not null references public.commission_periods(id),
  amount                   numeric(14,2) not null,       -- may be positive or negative
  reason                   text not null,
  adjustment_type          text not null
                             check (adjustment_type in ('refund','credit','correction','bonus','other')),
  source_invoice_id        uuid references public.invoices(id),
  source_credit_invoice_id uuid references public.invoices(id),
  created_at               timestamptz not null default now(),
  created_by               uuid references auth.users(id),
  constraint commission_adjustments_reason_nonempty check (length(btrim(reason)) > 0)
);
alter table public.commission_adjustments enable row level security;

create index if not exists idx_commission_adjustments_period  on public.commission_adjustments (period_id);
create index if not exists idx_commission_adjustments_user    on public.commission_adjustments (user_id);
create index if not exists idx_commission_adjustments_src_inv on public.commission_adjustments (source_invoice_id);

comment on table public.commission_adjustments is
  'Append-only signed commission adjustments (numeric(14,2) kronor). Tied to a commission_periods row. No UPDATE/DELETE. A credit for a locked month is posted as a NEGATIVE adjustment in the current OPEN period referencing the original + credit invoices.';

drop trigger if exists trg_commission_adjustments_immutable on public.commission_adjustments;
create trigger trg_commission_adjustments_immutable
  before update or delete on public.commission_adjustments
  for each row execute function public.commission_immutable();

-- ════════════════════════════════════════════════════════════════════════════
-- End schema foundation. Policies + RPCs + invoices.salesperson_user_id follow in
-- 20260714150500_commission_system_v1_rpcs_rls.sql.
-- ════════════════════════════════════════════════════════════════════════════

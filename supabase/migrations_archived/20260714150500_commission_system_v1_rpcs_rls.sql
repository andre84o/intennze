-- ════════════════════════════════════════════════════════════════════════════
-- COMMISSION SYSTEM v1 · RPCs + RLS + invoices.salesperson_user_id
--   Companion to 20260714150000_commission_system_v1_schema.sql (apply after it).
--
-- All 4 write RPCs are SECURITY DEFINER and self-gate on public.is_admin()
-- (evaluated against the CALLING user's auth.uid()). Granted to `authenticated`
-- so PostgREST can call them; non-admins get a clean 42501 raise. Reads are
-- governed by RLS (admin: all; active staff: own; suspended/ended/anon: none).
-- ════════════════════════════════════════════════════════════════════════════

-- ── A) invoices.salesperson_user_id (nullable; NO backfill; admin-only writes) ─
alter table public.invoices
  add column if not exists salesperson_user_id uuid references auth.users(id);
create index if not exists idx_invoices_salesperson on public.invoices(salesperson_user_id);

-- Defence-in-depth: only an admin may set/alter salesperson attribution.
create or replace function public.protect_invoice_salesperson() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin()
     and new.salesperson_user_id is distinct from old.salesperson_user_id then
    raise exception 'Only an admin can change salesperson attribution.';
  end if;
  return new;
end $$;
revoke execute on function public.protect_invoice_salesperson() from public;

drop trigger if exists trg_protect_invoice_salesperson on public.invoices;
create trigger trg_protect_invoice_salesperson before update on public.invoices
  for each row execute function public.protect_invoice_salesperson();

-- ════════════════════════════════════════════════════════════════════════════
-- B) confirm_invoice_paid(p_invoice_id, p_salesperson_user_id default null)
--    Admin-only. Replaces the client-side status='paid' update. Atomic + idempotent.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.confirm_invoice_paid(
  p_invoice_id uuid,
  p_salesperson_user_id uuid default null)
  returns json
  language plpgsql security definer set search_path = '' as $$
declare
  v_inv           public.invoices%rowtype;
  v_sales         uuid;
  v_eligible      boolean;
  v_period_start  date;
  v_period_end    date;
  v_period_id     uuid;
  v_entry_created boolean := false;
  v_reason        text := null;
  v_paid_at       timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can confirm an invoice as paid.' using errcode = '42501';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice % not found.', p_invoice_id using errcode = 'P0002';
  end if;

  if v_inv.is_credit_note then
    raise exception 'Credit notes are settled at creation and cannot be confirmed as paid.'
      using errcode = 'P0001';
  end if;
  if v_inv.status = 'cancelled' then
    raise exception 'Cannot confirm a cancelled invoice as paid.' using errcode = 'P0001';
  end if;

  if v_inv.status = 'paid' then
    -- idempotent short-circuit: report existing state, no second write
    v_period_start := (date_trunc('month', (v_inv.paid_at at time zone 'Europe/Stockholm')))::date;
    select ce.user_id into v_sales from public.commission_entries ce where ce.invoice_id = v_inv.id;
    select cp.id into v_period_id from public.commission_periods cp
      where cp.period_start = v_period_start and cp.user_id = v_sales;
    return json_build_object(
      'invoice', v_inv.id, 'invoice_number', v_inv.invoice_number, 'status', v_inv.status,
      'period', v_period_id, 'commission_created', false,
      'eligible', (v_sales is not null), 'reason', 'already-paid');
  end if;

  v_sales := coalesce(p_salesperson_user_id, v_inv.salesperson_user_id);
  if v_sales is null then
    raise exception 'A salesperson must be assigned before confirming payment.' using errcode = 'P0001';
  end if;

  v_paid_at := now();
  update public.invoices
     set salesperson_user_id = v_sales, status = 'paid', paid_at = v_paid_at
   where id = v_inv.id;

  select p.commission_eligible into v_eligible from public.profiles p where p.user_id = v_sales;
  v_eligible := coalesce(v_eligible, false);

  if not v_eligible then
    v_reason := 'salesperson-not-commission-eligible';
    perform public.log_audit('invoice.confirm_paid', 'invoices', v_inv.id::text,
      v_inv.invoice_number::text, jsonb_build_object('status', v_inv.status),
      jsonb_build_object('status','paid','paid_at', v_paid_at, 'salesperson_user_id', v_sales,
        'commission_created', false, 'eligible', false, 'reason', v_reason),
      null, null, 'success');
    return json_build_object('invoice', v_inv.id, 'invoice_number', v_inv.invoice_number,
      'status', 'paid', 'period', null, 'commission_created', false,
      'eligible', false, 'reason', v_reason);
  end if;

  v_period_start := (date_trunc('month', (v_paid_at at time zone 'Europe/Stockholm')))::date;
  v_period_end   := (date_trunc('month', v_period_start) + interval '1 month - 1 day')::date;

  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (v_sales, v_period_start, v_period_end, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select cp.id into v_period_id from public.commission_periods cp
    where cp.user_id = v_sales and cp.period_start = v_period_start;

  with ins as (
    insert into public.commission_entries
      (invoice_id, user_id, period_start, paid_at_snapshot, amount_ex_vat_snapshot,
       vat_amount_snapshot, total_snapshot, invoice_number_snapshot, customer_id, created_by)
    values (v_inv.id, v_sales, v_period_start, v_paid_at, v_inv.amount::numeric(14,2),
       v_inv.vat_amount::numeric(14,2), v_inv.total::numeric(14,2), v_inv.invoice_number,
       v_inv.customer_id, (select auth.uid()))
    on conflict (invoice_id) do nothing
    returning id)
  select exists (select 1 from ins) into v_entry_created;
  v_reason := case when v_entry_created then null else 'entry-already-exists' end;

  perform public.log_audit('invoice.confirm_paid', 'invoices', v_inv.id::text,
    v_inv.invoice_number::text, jsonb_build_object('status', v_inv.status),
    jsonb_build_object('status','paid','paid_at', v_paid_at, 'salesperson_user_id', v_sales,
      'period_start', v_period_start, 'commission_created', v_entry_created, 'eligible', true),
    null, null, 'success');

  return json_build_object('invoice', v_inv.id, 'invoice_number', v_inv.invoice_number,
    'status', 'paid', 'period', v_period_id, 'commission_created', v_entry_created,
    'eligible', true, 'reason', v_reason);
end $$;
revoke execute on function public.confirm_invoice_paid(uuid, uuid) from public, anon;
grant  execute on function public.confirm_invoice_paid(uuid, uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- C) approve_commission_period(p_period_id) — admin-only; freezes the month
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

  select ct.rate_percent into v_rate from public.commission_tiers ct
    where ct.effective_to is null
      and v_revenue >= ct.min_revenue_ex_vat
      and (ct.max_revenue_ex_vat is null or v_revenue < ct.max_revenue_ex_vat)
    order by ct.sort_order limit 1;
  if v_rate is null then
    raise exception 'No active commission tier matches revenue % for period %.', v_revenue, p_period_id
      using errcode = 'P0001';
  end if;

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

-- ════════════════════════════════════════════════════════════════════════════
-- D) mark_commission_period_paid(p_period_id) — admin-only; approved -> paid
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.mark_commission_period_paid(p_period_id uuid)
  returns json
  language plpgsql security definer set search_path = '' as $$
declare v_period public.commission_periods%rowtype; v_paid_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can mark a commission period paid.' using errcode = '42501';
  end if;
  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.status <> 'approved' then
    raise exception 'Period must be approved before it can be paid (current: %).', v_period.status
      using errcode = 'P0001';
  end if;

  v_paid_at := now();
  update public.commission_periods
     set status = 'paid', paid_at = v_paid_at, paid_by = (select auth.uid())
   where id = v_period.id;

  perform public.log_audit('commission_period.mark_paid', 'commission_periods', v_period.id::text,
    v_period.user_id::text || ' ' || v_period.period_start::text,
    jsonb_build_object('status', v_period.status),
    jsonb_build_object('status','paid','paid_at', v_paid_at, 'final_commission', v_period.final_commission_snapshot),
    null, null, 'success');

  return json_build_object('period', v_period.id, 'status', 'paid', 'paid_at', v_paid_at,
    'final_commission', v_period.final_commission_snapshot);
end $$;
revoke execute on function public.mark_commission_period_paid(uuid) from public, anon;
grant  execute on function public.mark_commission_period_paid(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- E) create_commission_adjustment(...) — admin-only; append-only; OPEN periods only
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.create_commission_adjustment(
  p_user_id uuid, p_period_id uuid, p_amount numeric, p_reason text,
  p_adjustment_type text, p_source_invoice_id uuid default null,
  p_source_credit_invoice_id uuid default null)
  returns json
  language plpgsql security definer set search_path = '' as $$
declare v_period public.commission_periods%rowtype; v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create a commission adjustment.' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A non-empty reason is required for an adjustment.' using errcode = 'P0001';
  end if;
  if p_adjustment_type is null or p_adjustment_type not in ('refund','credit','correction','bonus','other') then
    raise exception 'Invalid adjustment_type: %', p_adjustment_type using errcode = 'P0001';
  end if;
  if p_amount is null then
    raise exception 'Adjustment amount is required.' using errcode = 'P0001';
  end if;

  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.user_id <> p_user_id then
    raise exception 'Period % does not belong to user %.', p_period_id, p_user_id using errcode = 'P0001';
  end if;
  -- adjustments are only permitted on OPEN periods; approved/paid are locked.
  -- Corrections to a locked month are posted to the current open period instead.
  if v_period.status <> 'open' then
    raise exception 'Cannot adjust a % period; post the correction to the current open period.', v_period.status
      using errcode = 'P0001';
  end if;

  insert into public.commission_adjustments
    (user_id, period_id, amount, reason, adjustment_type, source_invoice_id, source_credit_invoice_id, created_by)
  values (p_user_id, p_period_id, p_amount::numeric(14,2), btrim(p_reason), p_adjustment_type,
     p_source_invoice_id, p_source_credit_invoice_id, (select auth.uid()))
  returning id into v_id;

  perform public.log_audit('commission_adjustment.create', 'commission_adjustments', v_id::text,
    p_user_id::text || ' ' || v_period.period_start::text, null,
    jsonb_build_object('amount', p_amount, 'reason', btrim(p_reason), 'adjustment_type', p_adjustment_type,
      'period_id', p_period_id, 'source_invoice_id', p_source_invoice_id,
      'source_credit_invoice_id', p_source_credit_invoice_id),
    null, null, 'success');

  return json_build_object('adjustment', v_id, 'period', p_period_id, 'user_id', p_user_id,
    'amount', p_amount::numeric(14,2));
end $$;
revoke execute on function public.create_commission_adjustment(uuid,uuid,numeric,text,text,uuid,uuid) from public, anon;
grant  execute on function public.create_commission_adjustment(uuid,uuid,numeric,text,text,uuid,uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- F) current_open_commission_period(p_user_id) — admin helper for locked-month
--    credits: resolves/creates the Stockholm "now" open period.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.current_open_commission_period(p_user_id uuid)
  returns uuid
  language plpgsql security definer set search_path = '' as $$
declare v_ps date; v_pe date; v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can resolve the current open period.' using errcode = '42501';
  end if;
  v_ps := (date_trunc('month', (now() at time zone 'Europe/Stockholm')))::date;
  v_pe := (date_trunc('month', v_ps) + interval '1 month - 1 day')::date;
  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (p_user_id, v_ps, v_pe, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select id into v_id from public.commission_periods where user_id = p_user_id and period_start = v_ps;
  return v_id;
end $$;
revoke execute on function public.current_open_commission_period(uuid) from public, anon;
grant  execute on function public.current_open_commission_period(uuid) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- G) get_commission_period_figures(p_period_id) — READ, invoker rights (RLS applies).
--    open => dynamic live calc; approved/paid => frozen snapshots. Used by the app
--    so the browser never computes money. Staff can only resolve their own period
--    (RLS on commission_periods/entries restricts what the queries can read).
-- ════════════════════════════════════════════════════════════════════════════
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
  select ct.rate_percent into v_rate from public.commission_tiers ct
    where ct.effective_to is null and v_revenue >= ct.min_revenue_ex_vat
      and (ct.max_revenue_ex_vat is null or v_revenue < ct.max_revenue_ex_vat)
    order by ct.sort_order limit 1;
  v_rate   := coalesce(v_rate, 0);
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
-- H) RLS POLICIES — pattern mirrors Release A/B exactly.
--    `to authenticated` only (anon denied). SELECT: admin OR (own AND active).
--    NO staff write policies => all writes go through the SECURITY DEFINER RPCs.
--    Immutability of entries/adjustments is enforced by the schema triggers.
--    service_role bypasses RLS (documented) but immutability triggers still block
--    UPDATE/DELETE on entries/adjustments even for service_role.
-- ════════════════════════════════════════════════════════════════════════════

-- commission_tiers: any active user may read; writes admin-only
drop policy if exists commission_tiers_select on public.commission_tiers;
drop policy if exists commission_tiers_write  on public.commission_tiers;
create policy commission_tiers_select on public.commission_tiers
  for select to authenticated using (public.is_admin() or public.is_active_user());
create policy commission_tiers_write on public.commission_tiers
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- commission_entries: admin all; active staff own; no write policies
drop policy if exists commission_entries_select on public.commission_entries;
create policy commission_entries_select on public.commission_entries
  for select to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and public.is_active_user()));

-- commission_periods: admin all; active staff own; no write policies (RPC-only)
drop policy if exists commission_periods_select on public.commission_periods;
create policy commission_periods_select on public.commission_periods
  for select to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and public.is_active_user()));

-- commission_adjustments: admin all; active staff own; no write policies
drop policy if exists commission_adjustments_select on public.commission_adjustments;
create policy commission_adjustments_select on public.commission_adjustments
  for select to authenticated
  using (public.is_admin() or (user_id = (select auth.uid()) and public.is_active_user()));

-- ════════════════════════════════════════════════════════════════════════════
-- I) Table privileges (self-contained; do not rely on default privileges).
--    RLS still governs which rows are visible/writable. Staff never write to
--    entries/periods/adjustments (writes go through the SECURITY DEFINER RPCs,
--    owned by the migration role). Only commission_tiers admits admin DML, so it
--    needs INSERT/UPDATE/DELETE (RLS restricts to is_admin()). anon gets nothing.
-- ════════════════════════════════════════════════════════════════════════════
grant select, insert, update, delete on public.commission_tiers to authenticated;
grant select on public.commission_entries     to authenticated;
grant select on public.commission_periods     to authenticated;
grant select on public.commission_adjustments to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- End RPCs + RLS.
-- ════════════════════════════════════════════════════════════════════════════

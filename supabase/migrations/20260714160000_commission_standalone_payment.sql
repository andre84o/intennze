-- ════════════════════════════════════════════════════════════════════════════
-- COMMISSION v1.1 · Standalone (invoice-less) commission payments (ADDITIVE)
--   The business does not work with invoices yet. Admin records a paid sale
--   directly (customer + salesperson + amount ex-VAT + paid date) → commission.
--   The invoice path (confirm_invoice_paid) is retained, unused, for the future.
--
-- Depends on 20260714150000 + 20260714150500.
-- ════════════════════════════════════════════════════════════════════════════

-- Make the invoice linkage OPTIONAL. A standalone payment has no invoice, but it
-- MUST still point to a customer (so we know where the money came from), so
-- customer_id stays NOT NULL. UNIQUE(invoice_id) still dedupes invoice-based
-- entries (NULLs are distinct → multiple standalone entries are allowed).
alter table public.commission_entries alter column invoice_id drop not null;
alter table public.commission_entries alter column invoice_number_snapshot drop not null;
alter table public.commission_entries add column if not exists note text;

comment on column public.commission_entries.invoice_id is
  'NULL for a standalone (invoice-less) commission payment recorded by an admin; set for an invoice-derived entry (confirm_invoice_paid).';

-- ════════════════════════════════════════════════════════════════════════════
-- record_commission_payment — admin records a paid sale against a CUSTOMER,
--   independent of any invoice. Creates one commission_entry (invoice_id NULL)
--   + ensures an OPEN period. Refuses locked (approved/paid) periods.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.record_commission_payment(
  p_salesperson_user_id uuid,
  p_customer_id uuid,
  p_amount_ex_vat numeric,
  p_paid_date date,
  p_note text default null)
  returns json
  language plpgsql security definer set search_path = '' as $$
declare
  v_eligible     boolean;
  v_period_start date;
  v_period_end   date;
  v_period_id    uuid;
  v_status       text;
  v_entry_id     uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a commission payment.' using errcode = '42501';
  end if;
  if p_amount_ex_vat is null or p_amount_ex_vat <= 0 then
    raise exception 'Amount (ex VAT) must be a positive number.' using errcode = 'P0001';
  end if;
  if p_paid_date is null then
    raise exception 'Paid date is required.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers c where c.id = p_customer_id) then
    raise exception 'Customer % not found.', p_customer_id using errcode = 'P0002';
  end if;

  -- salesperson must be commission-eligible (roles/eligibility live in profiles)
  select p.commission_eligible into v_eligible from public.profiles p where p.user_id = p_salesperson_user_id;
  if not coalesce(v_eligible, false) then
    raise exception 'Salesperson is not commission-eligible.' using errcode = 'P0001';
  end if;

  v_period_start := date_trunc('month', p_paid_date)::date;
  v_period_end   := (date_trunc('month', p_paid_date) + interval '1 month - 1 day')::date;

  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (p_salesperson_user_id, v_period_start, v_period_end, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select id, status into v_period_id, v_status from public.commission_periods
    where user_id = p_salesperson_user_id and period_start = v_period_start;

  -- never add to a locked month (approved/paid) — post a correction to the open month instead
  if v_status <> 'open' then
    raise exception 'Cannot add a payment to a % period (it is locked).', v_status using errcode = 'P0001';
  end if;

  insert into public.commission_entries
    (invoice_id, user_id, period_start, paid_at_snapshot, amount_ex_vat_snapshot,
     vat_amount_snapshot, total_snapshot, invoice_number_snapshot, customer_id, note, created_by)
  values
    (null, p_salesperson_user_id, v_period_start, p_paid_date::timestamptz,
     p_amount_ex_vat::numeric(14,2), 0, p_amount_ex_vat::numeric(14,2), null,
     p_customer_id, p_note, (select auth.uid()))
  returning id into v_entry_id;

  perform public.log_audit('commission.record_payment', 'commission_entries', v_entry_id::text,
    p_salesperson_user_id::text || ' ' || v_period_start::text, null,
    jsonb_build_object('amount_ex_vat', p_amount_ex_vat, 'customer_id', p_customer_id,
      'paid_date', p_paid_date, 'note', p_note, 'invoice_id', null),
    null, null, 'success');

  return json_build_object('entry', v_entry_id, 'period', v_period_id, 'period_start', v_period_start,
    'user_id', p_salesperson_user_id, 'amount_ex_vat', p_amount_ex_vat::numeric(14,2));
end $$;
revoke execute on function public.record_commission_payment(uuid,uuid,numeric,date,text) from public, anon;
grant  execute on function public.record_commission_payment(uuid,uuid,numeric,date,text) to authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- End standalone payment migration.
-- ════════════════════════════════════════════════════════════════════════════

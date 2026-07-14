-- ════════════════════════════════════════════════════════════════════════════
-- Commission System v1 — DB test suite. Each test = ONE rolled-back transaction.
-- Idiom matches 40_staff_tests.sql / 50_interactions_delete_tests.sql:
--   begin; [fixtures as superuser]; set local role authenticated;
--   set local request.jwt.claim.sub='<uuid>'; do $$ ... raise on failure ... $$; rollback;
-- Admin RPCs use jwt sub = admin a0 (..a0). Staff-denial uses staff s1 (..51) and
-- asserts the RPC RAISES (caught in an exception block).
-- Seed identities (supabase/test/.harness/10_seed.sql): admin a0 (..a0, NOT eligible),
--   staff s1 (..51, eligible, owns customer c1), s2 (..52, eligible, owns c2),
--   customer c1 (..c1), c2 (..c2).
-- Money: invoices.amount = whole-kronor EX-VAT; revenue = sum(amount);
--   commission = round(revenue*rate/100, 2). Tiers 15/20/25/30 seeded by migration.
-- NOTE: invoices requires due_date/period_start/period_end (NOT NULL) — supplied below.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- Spec 1 · 40000 ex-VAT -> 15% -> earned 6000
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000001','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000001'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 40000 then raise exception 'T1 FAIL: revenue=% (want 40000)', fig->>'revenue_ex_vat'; end if;
  if (fig->>'earned_commission')::numeric <> 6000 then raise exception 'T1 FAIL: earned=% (want 6000 @15%%)', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 2 · 60000 -> 20% on the WHOLE 60000 -> 12000
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000002','00000000-0000-0000-0000-0000000000c1',60000,15000,75000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000002'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'earned_commission')::numeric <> 12000 then raise exception 'T2 FAIL: earned=% (want 12000 = 20%% of whole 60000)', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 3 · 120000 -> 25% -> 30000
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000003','00000000-0000-0000-0000-0000000000c1',120000,30000,150000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000003'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'earned_commission')::numeric <> 30000 then raise exception 'T3 FAIL: earned=% (want 30000 @25%%)', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 4 · 160000 -> 30% -> 48000
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000004','00000000-0000-0000-0000-0000000000c1',160000,40000,200000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000004'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'earned_commission')::numeric <> 48000 then raise exception 'T4 FAIL: earned=% (want 48000 @30%%)', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 5 · VAT is NOT counted — base uses `amount` (ex-VAT) only (absurd vat_amount ignored)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000005','00000000-0000-0000-0000-0000000000c1',40000,99999,139999,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000005'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 40000 then raise exception 'T5 FAIL: VAT leaked, revenue=%', fig->>'revenue_ex_vat'; end if;
  if (fig->>'earned_commission')::numeric <> 6000 then raise exception 'T5 FAIL: earned=% (VAT must be excluded)', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 6 · two invoices in one period SUM (20000 + 20000 = 40000 -> 15% -> 6000; ONE period)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by) values
  ('00000000-0000-0000-0000-000000000006','00000000-0000-0000-0000-0000000000c1',20000,5000,25000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-000000000007','00000000-0000-0000-0000-0000000000c1',20000,5000,25000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; nper int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000006'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000007'::uuid, null);
  select count(*) into nper from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  if nper <> 1 then raise exception 'T6 FAIL: expected 1 period, got %', nper; end if;
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 40000 then raise exception 'T6 FAIL: summed revenue=% (want 40000)', fig->>'revenue_ex_vat'; end if;
  if (fig->>'earned_commission')::numeric <> 6000 then raise exception 'T6 FAIL: summed earned=%', fig->>'earned_commission'; end if;
end $$; rollback;

-- Spec 7 · same invoice cannot be counted twice (UNIQUE invoice_id / ON CONFLICT)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000008','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare nentry int; fig json; pid uuid; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000008'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000008'::uuid, null);
  select count(*) into nentry from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000008';
  if nentry <> 1 then raise exception 'T7 FAIL: invoice counted % times', nentry; end if;
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 40000 then raise exception 'T7 FAIL: revenue double-counted=%', fig->>'revenue_ex_vat'; end if;
end $$; rollback;

-- Spec 8 · Staff CANNOT confirm payment — RPC must RAISE for staff jwt
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000009','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare ok boolean:=false; begin
  begin perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000009'::uuid, null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'T8 FAIL: staff was allowed to confirm invoice paid'; end if;
end $$; rollback;

-- Spec 9 · SUSPENDED admin denied (role admin but account_status suspended -> is_admin() false)
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000a9','susp-admin@test.local') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status, commission_eligible) values ('00000000-0000-0000-0000-0000000000a9','admin', true, 'suspended', false);
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000000a','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a9';
do $$ declare ok boolean:=false; begin
  begin perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000a'::uuid, null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'T9 FAIL: suspended admin was allowed to confirm'; end if;
end $$; rollback;

-- Spec 10 · Staff sees ONLY own commission_entries (RLS)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by) values
  ('00000000-0000-0000-0000-00000000000b','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-00000000000c','00000000-0000-0000-0000-0000000000c2',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000052',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000b'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000c'::uuid, null);
end $$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare mine int; others int; begin
  select count(*) into mine   from public.commission_entries where user_id='00000000-0000-0000-0000-000000000051';
  select count(*) into others from public.commission_entries where user_id<>'00000000-0000-0000-0000-000000000051';
  if mine < 1   then raise exception 'T10 FAIL: staff cannot see own entries'; end if;
  if others<>0  then raise exception 'T10 FAIL: staff saw % other-user entries (RLS leak)', others; end if;
end $$; rollback;

-- Spec 11 · Admin sees ALL commission_entries
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by) values
  ('00000000-0000-0000-0000-00000000000d','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0'),
  ('00000000-0000-0000-0000-00000000000e','00000000-0000-0000-0000-0000000000c2',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000052',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare seen int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000d'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000e'::uuid, null);
  select count(*) into seen from public.commission_entries
    where user_id in ('00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000052');
  if seen < 2 then raise exception 'T11 FAIL: admin saw only % entries', seen; end if;
end $$; rollback;

-- Spec 12 · approve LOCKS the period (open -> approved; approved_by set)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000000f','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; st text; ab uuid; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000000f'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  perform public.approve_commission_period(pid);
  select status, approved_by into st, ab from public.commission_periods where id=pid;
  if st <> 'approved' then raise exception 'T12 FAIL: status=% (want approved)', st; end if;
  if ab is null then raise exception 'T12 FAIL: approved_by not set'; end if;
end $$; rollback;

-- Spec 13 · LOCKED period cannot be re-approved / recomputed
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000010','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; ok boolean:=false; e_before numeric; e_after numeric; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000010'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  perform public.approve_commission_period(pid);
  select earned_commission_snapshot into e_before from public.commission_periods where id=pid;
  begin perform public.approve_commission_period(pid); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'T13 FAIL: re-approve of locked period succeeded'; end if;
  select earned_commission_snapshot into e_after from public.commission_periods where id=pid;
  if e_after <> e_before then raise exception 'T13 FAIL: locked snapshot changed % -> %', e_before, e_after; end if;
end $$; rollback;

-- Spec 14 · mark paid REQUIRES approved
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000011','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; ok boolean:=false; st text; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000011'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  begin perform public.mark_commission_period_paid(pid); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'T14 FAIL: paid an un-approved (open) period'; end if;
  perform public.approve_commission_period(pid);
  perform public.mark_commission_period_paid(pid);
  select status into st from public.commission_periods where id=pid;
  if st <> 'paid' then raise exception 'T14 FAIL: after approve+pay status=%', st; end if;
end $$; rollback;

-- Spec 15 · negative adjustment REDUCES final commission (6000 - 1000 = 5000)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000012','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000012'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  perform public.create_commission_adjustment('00000000-0000-0000-0000-000000000051'::uuid, pid, -1000, 'clawback', 'correction', null, null);
  fig := public.get_commission_period_figures(pid);
  if (fig->>'final_commission')::numeric <> 5000 then raise exception 'T15 FAIL: final=% (want 6000-1000=5000)', fig->>'final_commission'; end if;
end $$; rollback;

-- Spec 16 · adjustment does NOT rewrite the entry snapshot; entries IMMUTABLE
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000013','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; a_before numeric; a_after numeric; ok boolean:=false; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000013'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  select amount_ex_vat_snapshot into a_before from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000013';
  perform public.create_commission_adjustment('00000000-0000-0000-0000-000000000051'::uuid, pid, -1000, 'clawback', 'correction', null, null);
  select amount_ex_vat_snapshot into a_after from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000013';
  if a_after <> a_before then raise exception 'T16 FAIL: entry snapshot changed % -> %', a_before, a_after; end if;
  begin update public.commission_entries set amount_ex_vat_snapshot=1 where invoice_id='00000000-0000-0000-0000-000000000013'; ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'T16 FAIL: commission_entries UPDATE allowed (not immutable)'; end if;
end $$; rollback;

-- Spec 17 · credit note does NOT double-count. confirm REFUSES credit notes; the
--   original stands alone at 40000; the credit's effect is via an adjustment.
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000014','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, original_invoice_id, status, paid_at, created_by)
  values ('00000000-0000-0000-0000-000000000015','00000000-0000-0000-0000-0000000000c1',-40000,-10000,-50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',true,'00000000-0000-0000-0000-000000000014','paid',now(),'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare fig json; pid uuid; ok boolean:=false; ncredit int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000014'::uuid, null);
  -- confirming a credit note must be REFUSED
  begin perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000015'::uuid, null); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'T17 FAIL: credit note was confirmable as paid'; end if;
  -- no commission entry exists for the credit note
  select count(*) into ncredit from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000015';
  if ncredit <> 0 then raise exception 'T17 FAIL: credit note produced a commission entry'; end if;
  -- original stands alone; no double count
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 40000 then raise exception 'T17 FAIL: revenue=% (want 40000, credit must not double-count)', fig->>'revenue_ex_vat'; end if;
end $$; rollback;

-- Spec 18 · non-eligible salesperson -> invoice PAID but NO entry / NO period
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000d1','noncomm@test.local') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status, commission_eligible) values ('00000000-0000-0000-0000-0000000000d1','staff', true, 'active', false);
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000016','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-0000000000d1',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare nentry int; nper int; st text; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000016'::uuid, null);
  select count(*) into nentry from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000016';
  if nentry <> 0 then raise exception 'T18 FAIL: entry created for non-eligible salesperson'; end if;
  select count(*) into nper from public.commission_periods where user_id='00000000-0000-0000-0000-0000000000d1';
  if nper <> 0 then raise exception 'T18 FAIL: period created for non-eligible salesperson'; end if;
  select status into st from public.invoices where id='00000000-0000-0000-0000-000000000016';
  if st <> 'paid' then raise exception 'T18 FAIL: invoice not marked paid'; end if;
end $$; rollback;

-- Spec 19 · Admin can be the salesperson (self)
begin;
update public.profiles set commission_eligible=true where user_id='00000000-0000-0000-0000-0000000000a0';
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000017','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31',null,false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare nentry int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000017'::uuid, '00000000-0000-0000-0000-0000000000a0'::uuid);
  select count(*) into nentry from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000017' and user_id='00000000-0000-0000-0000-0000000000a0';
  if nentry <> 1 then raise exception 'T19 FAIL: admin-as-salesperson entry count=%', nentry; end if;
end $$; rollback;

-- Spec 20 · period boundary follows Europe/Stockholm (direct expression test).
--   2025-01-31 23:30 UTC = 2025-02-01 00:30 Stockholm (CET) -> Feb period.
--   This is the exact expression confirm_invoice_paid uses to derive period_start.
begin;
do $$ declare ps date; begin
  ps := (date_trunc('month', (timestamptz '2025-01-31 23:30:00+00' at time zone 'Europe/Stockholm')))::date;
  if ps <> date '2025-02-01' then raise exception 'T20 FAIL: Stockholm boundary period_start=% (want 2025-02-01)', ps; end if;
  -- DST edge: 2025-06-30 22:30 UTC = 2025-07-01 00:30 Stockholm (CEST +2) -> July
  ps := (date_trunc('month', (timestamptz '2025-06-30 22:30:00+00' at time zone 'Europe/Stockholm')))::date;
  if ps <> date '2025-07-01' then raise exception 'T20 FAIL: DST boundary period_start=% (want 2025-07-01)', ps; end if;
end $$; rollback;

-- Spec 21 · parallel/repeated confirm yields exactly ONE entry (idempotency)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000018','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare nentry int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000018'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000018'::uuid, null);
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000018'::uuid, null);
  select count(*) into nentry from public.commission_entries where invoice_id='00000000-0000-0000-0000-000000000018';
  if nentry <> 1 then raise exception 'T21 FAIL: repeated confirm produced % entries', nentry; end if;
end $$; rollback;

-- Spec 22 · audit rows created for confirm / approve / pay (exact action strings)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-000000000019','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; c1 int; c2 int; c3 int; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-000000000019'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  perform public.approve_commission_period(pid);
  perform public.mark_commission_period_paid(pid);
  select count(*) into c1 from public.audit_log where action='invoice.confirm_paid';
  select count(*) into c2 from public.audit_log where action='commission_period.approve';
  select count(*) into c3 from public.audit_log where action='commission_period.mark_paid';
  if c1 < 1 then raise exception 'T22 FAIL: no audit row for confirm'; end if;
  if c2 < 1 then raise exception 'T22 FAIL: no audit row for approve'; end if;
  if c3 < 1 then raise exception 'T22 FAIL: no audit row for pay'; end if;
end $$; rollback;

-- Spec 23 · ANON denied (role anon: SELECT returns 0 rows; RPC has no execute grant)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001a','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role anon;
do $$ declare seen int; ok boolean:=false; begin
  -- anon has no grant AND no policy -> either 0 rows or permission denied; both = denied.
  begin
    select count(*) into seen from public.commission_entries;
    if seen <> 0 then raise exception 'T23 FAIL: anon saw % commission entries', seen; end if;
  exception when insufficient_privilege then null; end;
  begin perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001a'::uuid, null); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'T23 FAIL: anon executed confirm_invoice_paid'; end if;
end $$; rollback;

-- Spec 24 · ENDED staff sees NOTHING (employment_end in the past -> not active)
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000e5','ended-comm@test.local') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status, commission_eligible, employment_end)
  values ('00000000-0000-0000-0000-0000000000e5','staff', true, 'active', true, date '2020-01-01');
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001b','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-0000000000e5',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ begin perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001b'::uuid, null); end $$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000e5';
do $$ declare seen int; begin
  select count(*) into seen from public.commission_entries;
  if seen <> 0 then raise exception 'T24 FAIL: ended staff saw % commission entries', seen; end if;
end $$; rollback;

-- C25 (edge) · tier boundary EXACTLY at threshold: 60000 -> 20% (inclusive min)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001c','00000000-0000-0000-0000-0000000000c1',60000,15000,75000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001c'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'tier_rate_percent')::numeric <> 20 then raise exception 'C25 FAIL: 60000 got rate % (want 20)', fig->>'tier_rate_percent'; end if;
end $$; rollback;

-- C26 (edge) · just below threshold: 49999 -> 15% (not 20)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001d','00000000-0000-0000-0000-0000000000c1',49999,12500,62499,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001d'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'tier_rate_percent')::numeric <> 15 then raise exception 'C26 FAIL: 49999 got rate % (want 15)', fig->>'tier_rate_percent'; end if;
  if (fig->>'earned_commission')::numeric <> 7499.85 then raise exception 'C26 FAIL: 49999@15%% earned=% (want 7499.85)', fig->>'earned_commission'; end if;
end $$; rollback;

-- C27 (edge) · adjustment on a PAID period is REJECTED
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001e','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; ok boolean:=false; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001e'::uuid, null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  perform public.approve_commission_period(pid);
  perform public.mark_commission_period_paid(pid);
  begin perform public.create_commission_adjustment('00000000-0000-0000-0000-000000000051'::uuid, pid, -500, 'late', 'correction', null, null); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'C27 FAIL: adjustment accepted on a PAID period'; end if;
end $$; rollback;

-- C28 (edge) · staff cannot approve / pay / adjust (RPC gating beyond confirm)
begin;
insert into public.invoices(id, customer_id, amount, vat_amount, total, due_date, period_start, period_end, salesperson_user_id, is_credit_note, created_by)
  values ('00000000-0000-0000-0000-00000000001f','00000000-0000-0000-0000-0000000000c1',40000,10000,50000,'2026-07-31','2026-07-01','2026-07-31','00000000-0000-0000-0000-000000000051',false,'00000000-0000-0000-0000-0000000000a0');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; begin
  perform public.confirm_invoice_paid('00000000-0000-0000-0000-00000000001f'::uuid, null);
end $$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';  -- staff
do $$ declare pid uuid; ok boolean; begin
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051';
  ok:=false; begin perform public.approve_commission_period(pid); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'C28 FAIL: staff approved a period'; end if;
  ok:=false; begin perform public.mark_commission_period_paid(pid); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'C28 FAIL: staff marked a period paid'; end if;
  ok:=false; begin perform public.create_commission_adjustment('00000000-0000-0000-0000-000000000051'::uuid, pid, -100, 'x', 'correction', null, null); ok:=true; exception when others then ok:=false; end;
  if ok then raise exception 'C28 FAIL: staff created an adjustment'; end if;
end $$; rollback;

select '===== ALL COMMISSION TESTS PASSED (T1-T24 + C25-C28) =====' as result;

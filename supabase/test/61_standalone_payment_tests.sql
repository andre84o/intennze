-- ════════════════════════════════════════════════════════════════════════════
-- Standalone commission payment tests (record_commission_payment).
-- Idiom + seed identities as in 60_commission_tests.sql:
--   admin a0 (..a0), staff s1 (..51, eligible, owns c1), s2 (..52), customer c1 (..c1).
-- Each test = one rolled-back transaction.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- S1 · records an invoice-less entry (invoice_id NULL, customer set) → 60000 → 20% → 12000
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; inv_id uuid; invno int; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,
    '00000000-0000-0000-0000-0000000000c1'::uuid, 60000, date '2026-07-15', 'S1 test');
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 60000 then raise exception 'S1 FAIL revenue=%', fig->>'revenue_ex_vat'; end if;
  if (fig->>'earned_commission')::numeric <> 12000 then raise exception 'S1 FAIL earned=%', fig->>'earned_commission'; end if;
  select invoice_id, invoice_number_snapshot into inv_id, invno from public.commission_entries where user_id='00000000-0000-0000-0000-000000000051' and customer_id='00000000-0000-0000-0000-0000000000c1';
  if inv_id is not null then raise exception 'S1 FAIL invoice_id not null'; end if;
  if invno is not null then raise exception 'S1 FAIL invoice_number_snapshot not null'; end if;
end $$; rollback;

-- S2 · sums with other standalone payments in the same period (40000 + 20000 = 60000 -> 20%)
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 40000, date '2026-07-03', null);
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 20000, date '2026-07-20', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'revenue_ex_vat')::numeric <> 60000 then raise exception 'S2 FAIL summed revenue=%', fig->>'revenue_ex_vat'; end if;
  if (fig->>'earned_commission')::numeric <> 12000 then raise exception 'S2 FAIL summed earned=%', fig->>'earned_commission'; end if;
end $$; rollback;

-- S3 · staff CANNOT record a payment (RPC raises for staff jwt)
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare ok boolean:=false; begin
  begin perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 40000, date '2026-07-15', null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'S3 FAIL: staff recorded a payment'; end if;
end $$; rollback;

-- S4 · non-eligible salesperson rejected
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-0000000000d1','noncomm2@test.local') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status, commission_eligible) values ('00000000-0000-0000-0000-0000000000d1','staff', true, 'active', false);
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  begin perform public.record_commission_payment('00000000-0000-0000-0000-0000000000d1'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 40000, date '2026-07-15', null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'S4 FAIL: non-eligible salesperson accepted'; end if;
end $$; rollback;

-- S5 · locked (approved) period rejects a new payment
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; ok boolean:=false; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 40000, date '2026-07-15', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  perform public.approve_commission_period(pid);
  begin perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 10000, date '2026-07-16', null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'S5 FAIL: payment added to a locked period'; end if;
end $$; rollback;

-- S6 · two standalone payments allowed (invoice_id NULL not deduped) → 2 entries
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare n int; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 5000, date '2026-07-10', 'a');
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 5000, date '2026-07-10', 'b');
  select count(*) into n from public.commission_entries where user_id='00000000-0000-0000-0000-000000000051' and invoice_id is null;
  if n <> 2 then raise exception 'S6 FAIL: expected 2 standalone entries, got %', n; end if;
end $$; rollback;

-- S7 · unknown customer rejected
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  begin perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000fe'::uuid, 40000, date '2026-07-15', null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'S7 FAIL: unknown customer accepted'; end if;
end $$; rollback;

-- S8 · non-positive amount rejected
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  begin perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 0, date '2026-07-15', null); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'S8 FAIL: zero amount accepted'; end if;
end $$; rollback;

-- S9 · audit row 'commission.record_payment' created
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare n int; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 40000, date '2026-07-15', 'audit test');
  select count(*) into n from public.audit_log where action='commission.record_payment';
  if n < 1 then raise exception 'S9 FAIL: no audit row for record_payment'; end if;
end $$; rollback;

select '===== ALL STANDALONE PAYMENT TESTS PASSED (S1-S9) =====' as result;

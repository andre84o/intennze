-- ════════════════════════════════════════════════════════════════════════════
-- Per-salesperson commission ladder tests (salesperson_commission_tiers +
-- commission_rate_for + commission_next_tier_gap + settings RLS).
-- Idiom + seed identities as in 60/61: admin a0, staff s1 (..51, eligible,
-- owns c1), s2 (..52), customer c1 (..c1). Each test = one rolled-back tx.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- P1 · NO personal ladder → falls back to the GLOBAL ladder (60000 → 20% → 12000)
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare pid uuid; fig json; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 60000, date '2026-07-15', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'tier_rate_percent')::numeric <> 20 then raise exception 'P1 FAIL fallback rate=%', fig->>'tier_rate_percent'; end if;
  if (fig->>'earned_commission')::numeric <> 12000 then raise exception 'P1 FAIL earned=%', fig->>'earned_commission'; end if;
end $$; rollback;

-- P2 · PERSONAL ladder overrides global. Ladder 0→10%, 50001→40%, 100001→50%.
--       revenue 60000 → highest min<=60000 = 50001 → 40% → 24000
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent) values
  ('00000000-0000-0000-0000-000000000051',1,0,50000,10),
  ('00000000-0000-0000-0000-000000000051',2,50001,100000,40),
  ('00000000-0000-0000-0000-000000000051',3,100001,null,50);
do $$ declare pid uuid; fig json; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 60000, date '2026-07-15', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'tier_rate_percent')::numeric <> 40 then raise exception 'P2 FAIL personal rate=%', fig->>'tier_rate_percent'; end if;
  if (fig->>'earned_commission')::numeric <> 24000 then raise exception 'P2 FAIL earned=%', fig->>'earned_commission'; end if;
end $$; rollback;

-- P3 · boundary: revenue exactly 50000 with ladder (0→10, 50001→40) → 0-tier → 10% → 5000
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent) values
  ('00000000-0000-0000-0000-000000000051',1,0,50000,10),
  ('00000000-0000-0000-0000-000000000051',2,50001,null,40);
do $$ declare pid uuid; fig json; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 50000, date '2026-07-15', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  fig := public.get_commission_period_figures(pid);
  if (fig->>'tier_rate_percent')::numeric <> 10 then raise exception 'P3 FAIL boundary rate=%', fig->>'tier_rate_percent'; end if;
  if (fig->>'earned_commission')::numeric <> 5000 then raise exception 'P3 FAIL earned=%', fig->>'earned_commission'; end if;
end $$; rollback;

-- P4 · approve freezes the PERSONAL rate into the snapshot (40% on 60000 → 24000)
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent) values
  ('00000000-0000-0000-0000-000000000051',1,0,50000,10),
  ('00000000-0000-0000-0000-000000000051',2,50001,null,40);
do $$ declare pid uuid; res json; rate numeric; begin
  perform public.record_commission_payment('00000000-0000-0000-0000-000000000051'::uuid,'00000000-0000-0000-0000-0000000000c1'::uuid, 60000, date '2026-07-15', null);
  select id into pid from public.commission_periods where user_id='00000000-0000-0000-0000-000000000051' and period_start='2026-07-01';
  res := public.approve_commission_period(pid);
  select tier_rate_percent_snapshot into rate from public.commission_periods where id=pid;
  if rate <> 40 then raise exception 'P4 FAIL frozen rate=%', rate; end if;
  if (res->>'final_commission')::numeric <> 24000 then raise exception 'P4 FAIL final=%', res->>'final_commission'; end if;
end $$; rollback;

-- P5 · commission_next_tier_gap uses personal thresholds. mins {0,50001,100001},
--       revenue 60000 → next 100001 → gap 40001
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent) values
  ('00000000-0000-0000-0000-000000000051',1,0,50000,10),
  ('00000000-0000-0000-0000-000000000051',2,50001,100000,40),
  ('00000000-0000-0000-0000-000000000051',3,100001,null,50);
do $$ declare gap numeric; begin
  gap := public.commission_next_tier_gap('00000000-0000-0000-0000-000000000051'::uuid, 60000);
  if gap <> 40001 then raise exception 'P5 FAIL gap=%', gap; end if;
end $$; rollback;

-- P6 · a salesperson may read their OWN gap (self-guard passes), but NOT another's
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare gap numeric; ok boolean:=false; begin
  gap := public.commission_next_tier_gap('00000000-0000-0000-0000-000000000051'::uuid, 60000); -- own → allowed
  begin gap := public.commission_next_tier_gap('00000000-0000-0000-0000-000000000052'::uuid, 60000); ok:=true; -- other → deny
  exception when others then ok:=false; end;
  if ok then raise exception 'P6 FAIL: staff read another user gap'; end if;
end $$; rollback;

-- P7 · ladder + settings are ADMIN-ONLY (RLS): staff sees 0 rows even when they exist
begin;
insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent)
  values ('00000000-0000-0000-0000-000000000051',1,0,null,25);
insert into public.salesperson_commission_settings (user_id, base_salary) values ('00000000-0000-0000-0000-000000000051', 30000);
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare nt int; ns int; begin
  select count(*) into nt from public.salesperson_commission_tiers;
  select count(*) into ns from public.salesperson_commission_settings;
  if nt <> 0 then raise exception 'P7 FAIL: staff saw % ladder rows', nt; end if;
  if ns <> 0 then raise exception 'P7 FAIL: staff saw % settings rows', ns; end if;
end $$; rollback;

-- P8 · staff CANNOT insert into the ladder (RLS with-check is_admin())
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare ok boolean:=false; begin
  begin insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, rate_percent)
    values ('00000000-0000-0000-0000-000000000051',1,0,99); ok:=true;
  exception when others then ok:=false; end;
  if ok then raise exception 'P8 FAIL: staff inserted a ladder row'; end if;
end $$; rollback;

-- P9 · admin CAN write + read the ladder and base salary
begin;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare nt int; sal numeric; begin
  insert into public.salesperson_commission_tiers (user_id, sort_order, min_revenue_ex_vat, max_revenue_ex_vat, rate_percent)
    values ('00000000-0000-0000-0000-000000000051',1,0,50000,12);
  insert into public.salesperson_commission_settings (user_id, base_salary) values ('00000000-0000-0000-0000-000000000051', 28000);
  select count(*) into nt from public.salesperson_commission_tiers where user_id='00000000-0000-0000-0000-000000000051';
  select base_salary into sal from public.salesperson_commission_settings where user_id='00000000-0000-0000-0000-000000000051';
  if nt <> 1 then raise exception 'P9 FAIL: admin read % rows', nt; end if;
  if sal <> 28000 then raise exception 'P9 FAIL: base salary=%', sal; end if;
end $$; rollback;

select '===== ALL PER-SALESPERSON TESTS PASSED (P1-P9) =====' as result;

-- ════════════════════════════════════════════════════════════════════════════
-- domain_pricing_rules table-level GRANT / RLS interaction tests.
-- Depends on: 20260730000000_domain_pricing_rules + 20260731000001_grant.
-- Each test = own txn, ROLLED BACK.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- G1 · anon has NO privilege (not granted SELECT at all)
begin;
  set local role anon;
  do $$ declare ok boolean := false; begin
    begin
      perform count(*) from public.domain_pricing_rules;
      ok := true;
    exception when insufficient_privilege then ok := false; end;
    if ok then raise exception 'G1 FAIL: anon can query domain_pricing_rules'; end if;
  end $$;
rollback;

-- G2 · authenticated customer: SELECT succeeds (grant ok) but RLS returns 0 rows
begin;
  insert into auth.users(id,email)
    values ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status)
    values ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ declare n int; begin
    select count(*) into n from public.domain_pricing_rules;
    if n <> 0 then raise exception 'G2 FAIL: customer sees % row(s), expected 0', n; end if;
  end $$;
rollback;

-- G3 · authenticated admin: SELECT returns rows (grant + RLS dpr_admin_select)
begin;
  insert into auth.users(id,email)
    values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status)
    values ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare n int; begin
    select count(*) into n from public.domain_pricing_rules;
    if n <> 1 then raise exception 'G3 FAIL: admin sees % row(s), expected 1', n; end if;
  end $$;
rollback;

-- G4 · authenticated admin: direct INSERT denied (SELECT only; writes via RPC)
begin;
  insert into auth.users(id,email)
    values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status)
    values ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare ok boolean := false; begin
    begin
      insert into public.domain_pricing_rules(tld,operation,calculation_type,fixed_customer_price_minor)
        values ('nu','register','fixed',9900);
      ok := true;
    exception when insufficient_privilege then ok := false; end;
    if ok then raise exception 'G4 FAIL: admin direct INSERT succeeded (must use RPC)'; end if;
  end $$;
rollback;

-- G5 · authenticated seller/staff: SELECT 0 rows (RLS; no admin policy match)
begin;
  insert into auth.users(id,email)
    values ('00000000-0000-0000-0000-000000000051','sel@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status)
    values ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare n int; begin
    select count(*) into n from public.domain_pricing_rules;
    if n <> 0 then raise exception 'G5 FAIL: staff/seller sees % row(s), expected 0', n; end if;
  end $$;
rollback;

select '===== ALL GRANT TESTS PASSED =====' as result;

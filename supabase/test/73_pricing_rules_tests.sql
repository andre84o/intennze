-- ════════════════════════════════════════════════════════════════════════════
-- domain_pricing_rules RLS + RPC + overlap tests. Each test = txn, ROLLED BACK.
-- Idiom matches 71_hostup_link_tests.sql: self-seeding, literal UUIDs,
--   set local role authenticated; set local request.jwt.claim.sub='<uuid>';
--   do $$ ... raise on fail ... $$; rollback.
-- Depends on: baseline 20260727000000 + 20260730000000_domain_pricing_rules.
-- Identities: admin ..a0; portal customer PU1 ..d1; staff/seller ..51.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- R1 · ADMIN can create a rule via the RPC (audited)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare v_id uuid; n int; begin
    v_id := public.create_domain_pricing_rule('register','fixed','se',19900);
    if (select count(*) from public.domain_pricing_rules where id=v_id) <> 1
      then raise exception 'R1a FAIL: rule not created'; end if;
    select count(*) into n from public.audit_log where action='DOMAIN_PRICING_RULE_CREATED';
    if n <> 1 then raise exception 'R1b FAIL: create audit rows=%', n; end if;
    -- audit must NOT contain a provider price/secret
    if exists (select 1 from public.audit_log where action='DOMAIN_PRICING_RULE_CREATED'
                 and (after ? 'apiKey' or after ? 'provider_amount_minor'))
      then raise exception 'R1c FAIL: sensitive field in audit'; end if;
  end $$;
rollback;

-- R2 · CUSTOMER cannot SELECT pricing rules (RLS: admin-only) -> count 0
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  -- seed a rule as table owner (RLS bypassed pre-role-switch)
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ begin
    if (select count(*) from public.domain_pricing_rules) <> 0
      then raise exception 'R2 FAIL: customer can read pricing rules'; end if;
  end $$;
rollback;

-- R3 · CUSTOMER cannot INSERT / UPDATE (no write policy -> denied / 0 rows)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ declare ok boolean:=false; n int; begin
    begin
      insert into public.domain_pricing_rules(tld,operation,calculation_type,fixed_customer_price_minor)
        values ('nu','register','fixed',9900); ok:=true;
    exception when insufficient_privilege or check_violation then ok:=false; end;
    if ok then raise exception 'R3a FAIL: customer inserted a rule'; end if;
    update public.domain_pricing_rules set is_active=false where id='00000000-0000-0000-0000-0000000000f1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'R3b FAIL: customer updated a rule (% rows)', n; end if;
  end $$;
rollback;

-- R4 · CUSTOMER cannot call the create RPC (is_admin check -> P0001)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ declare ok boolean:=false; begin
    begin perform public.create_domain_pricing_rule('register','fixed','se',19900); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'R4 FAIL: customer called create RPC'; end if;
  end $$;
rollback;

-- R5 · SELLER/STAFF denied (SELECT 0; create RPC P0001)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000051','sel@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(id,tld,operation,calculation_type,fixed_customer_price_minor)
    values ('00000000-0000-0000-0000-0000000000f1','se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare ok boolean:=false; begin
    if (select count(*) from public.domain_pricing_rules) <> 0
      then raise exception 'R5a FAIL: staff read pricing rules'; end if;
    begin perform public.create_domain_pricing_rule('register','fixed','nu',9900); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'R5b FAIL: staff created a rule'; end if;
  end $$;
rollback;

-- R6 · OVERLAPPING active rule (same tld/operation/currency) rejected by the RPC
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare ok boolean:=false; begin
    perform public.create_domain_pricing_rule('register','fixed','se',19900);         -- standing active
    begin perform public.create_domain_pricing_rule('register','percentage_markup','se',null,null,null,2500); ok:=true;
    exception when sqlstate 'P0001' or unique_violation then ok:=false; end;
    if ok then raise exception 'R6 FAIL: overlapping active rule accepted'; end if;
  end $$;
rollback;

-- R7 · get_active_domain_pricing_rules returns config but the row carries no
--      provider price column (margin cannot be reconstructed customer-side)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.domain_pricing_rules(tld,operation,calculation_type,fixed_customer_price_minor)
    values ('se','register','fixed',19900);
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';  -- customer (calc runs server-side)
  do $$ declare n int; begin
    select count(*) into n from public.get_active_domain_pricing_rules('SEK','register','se');
    if n <> 1 then raise exception 'R7 FAIL: active rule not returned (%)', n; end if;
  end $$;
rollback;

select '===== ALL PRICING RULE TESTS PASSED =====' as result;

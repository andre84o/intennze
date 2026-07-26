-- ════════════════════════════════════════════════════════════════════════════
-- Domains RLS + uniqueness + ownership tests. Each test = one transaction,
-- ROLLED BACK. Idiom matches 40_staff_tests.sql / 50_interactions_delete_tests.sql:
--   begin; [seed as superuser]; set local role authenticated;
--   set local request.jwt.claim.sub='<uuid>'; do $$ ... raise on fail ... $$; rollback;
-- Self-seeds ALL fixtures (does NOT depend on the missing .harness/10_seed.sql).
-- Literal UUIDs throughout (psql \set vars are NOT interpolated inside $$).
-- Depends on: 20260713213000 (is_admin/is_active_user), 20260726120000
--   (role 'customer'), 20260726130000 (domains foundation under test).
--
-- Identities: admin ADM (..a0); portal customer PU1 (..d1) -> customer CU1 (..c1);
--   portal customer PU2 (..d2) -> customer CU2 (..c2); staff STF (..51).
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- D1 · a portal customer can READ their OWN domain
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status,email) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active','pu1@x.se')
    on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','Owned','Cust','customer',
            '00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','example.com','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e1') <> 1
      then raise exception 'D1 FAIL: customer cannot read own domain'; end if;
  end $$;
rollback;

-- D2 · a portal customer CANNOT read ANOTHER customer's domain (count = 0)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se'),
    ('00000000-0000-0000-0000-0000000000d2','pu2@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active'),
    ('00000000-0000-0000-0000-0000000000d2','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by) values
    ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0'),
    ('00000000-0000-0000-0000-0000000000c2','B','B','customer','00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c2','other.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';  -- PU1 tries to read CU2's domain
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e2') <> 0
      then raise exception 'D2 FAIL: customer saw another customer domain'; end if;
  end $$;
rollback;

-- D3 · a portal customer CANNOT change status (RLS write is admin-only -> 0 rows)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','x.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ declare n int; begin
    update public.domains set status='cancelled' where id='00000000-0000-0000-0000-0000000000e1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'D3 FAIL: customer changed status (% rows)', n; end if;
  end $$;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';  -- verify as admin
  do $$ begin
    if (select status from public.domains where id='00000000-0000-0000-0000-0000000000e1') <> 'active'
      then raise exception 'D3b FAIL: status was mutated'; end if;
  end $$;
rollback;

-- D4 · ADMIN can READ and UPDATE any domain
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','x.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare n int; begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e1') <> 1
      then raise exception 'D4a FAIL: admin cannot read domain'; end if;
    update public.domains set status='cancelled' where id='00000000-0000-0000-0000-0000000000e1';
    get diagnostics n = row_count;
    if n <> 1 then raise exception 'D4b FAIL: admin update affected % rows', n; end if;
  end $$;
rollback;

-- D5 · admin customer-view scope: an admin session can read the previewed
--   customer's domain (customer-view scoping is enforced in the SERVICE via
--   .eq('customer_id', viewedCustomerId); this proves the admin RLS path works).
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d2','pu2@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d2','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c2','B','B','customer','00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c2','cv.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';  -- admin (customer-view runs as admin)
  do $$ begin
    if (select count(*) from public.domains
          where customer_id='00000000-0000-0000-0000-0000000000c2') <> 1
      then raise exception 'D5 FAIL: admin cannot read previewed customer domain'; end if;
  end $$;
rollback;

-- D6 · STAFF (SELLER) has NO domain access (SELECT count 0; INSERT blocked)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-000000000051','stf@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active'),
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','x.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';  -- staff
  do $$ declare ok boolean:=false; begin
    if (select count(*) from public.domains) <> 0
      then raise exception 'D6a FAIL: staff saw domains'; end if;
    begin
      insert into public.domains(customer_id,name,status)
        values ('00000000-0000-0000-0000-0000000000c1','y.se','active'); ok:=true;
    exception when insufficient_privilege or check_violation then ok:=false; end;
    if ok then raise exception 'D6b FAIL: staff inserted a domain'; end if;
  end $$;
rollback;

-- D7 · UNIQUE normalized name is enforced (case-variant = same domain)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','example.com','active');
  do $$ declare ok boolean:=false; begin
    begin
      insert into public.domains(customer_id,name,status)
        values ('00000000-0000-0000-0000-0000000000c1','example.com','active'); ok:=true;
    exception when unique_violation then ok:=false; end;
    if ok then raise exception 'D7 FAIL: duplicate normalized name accepted'; end if;
  end $$;
rollback;

-- D8 · the name CHECK rejects a non-normalized (uppercase / path) value
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  do $$ declare ok boolean:=false; begin
    begin
      insert into public.domains(customer_id,name,status)
        values ('00000000-0000-0000-0000-0000000000c1','Example.com','active'); ok:=true;  -- uppercase
    exception when check_violation then ok:=false; end;
    if ok then raise exception 'D8a FAIL: uppercase name accepted'; end if;
    begin
      insert into public.domains(customer_id,name,status)
        values ('00000000-0000-0000-0000-0000000000c1','example.com/path','active'); ok:=true;  -- slash
    exception when check_violation then ok:=false; end;
    if ok then raise exception 'D8b FAIL: name with path accepted'; end if;
  end $$;
rollback;

-- D9 · registrant read-own via parent domain; separate from customer profile
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se'),
    ('00000000-0000-0000-0000-0000000000d2','pu2@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active'),
    ('00000000-0000-0000-0000-0000000000d2','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by) values
    ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0'),
    ('00000000-0000-0000-0000-0000000000c2','B','B','customer','00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status) values
    ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','x.se','active'),
    ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c2','y.se','active');
  -- registrant differs from the customer profile (different legal name)
  insert into public.domain_registrants(domain_id,first_name,last_name,email,country_code)
    values ('00000000-0000-0000-0000-0000000000e1','Legal','Registrant','reg@x.se','SE');
  insert into public.domain_registrants(domain_id,first_name,last_name)
    values ('00000000-0000-0000-0000-0000000000e2','Other','Registrant');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';  -- PU1
  do $$ begin
    -- can read OWN registrant
    if (select count(*) from public.domain_registrants
          where domain_id='00000000-0000-0000-0000-0000000000e1') <> 1
      then raise exception 'D9a FAIL: customer cannot read own registrant'; end if;
    -- cannot read ANOTHER customer's registrant
    if (select count(*) from public.domain_registrants
          where domain_id='00000000-0000-0000-0000-0000000000e2') <> 0
      then raise exception 'D9b FAIL: customer saw another registrant'; end if;
    -- registrant is a distinct legal identity, not the customer profile name
    if (select first_name from public.domain_registrants
          where domain_id='00000000-0000-0000-0000-0000000000e1') <> 'Legal'
      then raise exception 'D9c FAIL: registrant identity wrong'; end if;
  end $$;
rollback;

-- D10 · create_manual_domain is admin-only + atomic; audit row is written
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-000000000051','stf@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active'),
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  -- staff caller is rejected
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare ok boolean:=false; begin
    begin perform public.create_manual_domain('00000000-0000-0000-0000-0000000000c1','staff.se'); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'D10a FAIL: staff created a domain'; end if;
  end $$;
  -- admin caller creates domain + registrant atomically and it is audited
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare v_id uuid; n int; begin
    v_id := public.create_manual_domain(
      '00000000-0000-0000-0000-0000000000c1','atomic.se','pending',
      null,null,false,false,array['ns1.x.se','ns2.x.se'],
      jsonb_build_object('first_name','Reg','country_code','SE'));
    if (select count(*) from public.domains where id=v_id) <> 1
      then raise exception 'D10b FAIL: domain not created'; end if;
    if (select count(*) from public.domain_registrants where domain_id=v_id) <> 1
      then raise exception 'D10c FAIL: registrant not created atomically'; end if;
    select count(*) into n from public.audit_log
      where action='domain.create' and target_type='domain' and target_id=v_id::text;
    if n <> 1 then raise exception 'D10d FAIL: domain.create audit rows=%', n; end if;
  end $$;
rollback;

-- D11 · a non-admin (staff) cannot set customers.portal_user_id. Whether the
--   attempt is blocked by RLS (0 rows affected) or by the protect_customer_columns
--   trigger (raise), the security property is identical: the link must NOT change.
--   We assert the outcome (link still unset), not the mechanism.
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-000000000051','stf@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active'),
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.user_permissions(user_id,permission) values
    ('00000000-0000-0000-0000-000000000051','customers.update_own') on conflict do nothing;
  -- staff owns this customer
  insert into public.customers(id,first_name,last_name,status,owner_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer',
            '00000000-0000-0000-0000-000000000051','00000000-0000-0000-0000-000000000051');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';  -- staff owner
  do $$ begin
    begin
      update public.customers set portal_user_id='00000000-0000-0000-0000-0000000000d1'
        where id='00000000-0000-0000-0000-0000000000c1';
    exception when others then null;  -- a trigger raise is an acceptable block
    end;
  end $$;
  -- verify as admin: the portal link must still be unset
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ begin
    if (select portal_user_id from public.customers
          where id='00000000-0000-0000-0000-0000000000c1') is not null
      then raise exception 'D11 FAIL: non-admin changed portal_user_id'; end if;
  end $$;
rollback;

select '===== ALL DOMAIN TESTS PASSED =====' as result;

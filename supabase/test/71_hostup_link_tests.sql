-- ════════════════════════════════════════════════════════════════════════════
-- Hostup link/RLS/uniqueness tests. Each test = one transaction, ROLLED BACK.
-- Idiom matches 70_domain_tests.sql: self-seeding fixtures, literal UUIDs,
--   set local role authenticated; set local request.jwt.claim.sub='<uuid>';
--   do $$ ... raise on fail ... $$; rollback.
-- Depends on: baseline 20260727000000 + forward 20260728000000_hostup_provider_pivot.
-- Uses the real column name `registrar` with the pivoted value 'hostup'.
-- Identities: admin ..a0; portal PU1 ..d1 -> customer ..c1; PU2 ..d2 -> ..c2; staff ..51.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- H1 · ADMIN can link a Hostup domain (set registrar='hostup', provider_domain_id, customer)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare v_id uuid; begin
    insert into public.domains(customer_id,name,status,registrar,provider_domain_id,last_synced_at)
      values ('00000000-0000-0000-0000-0000000000c1','hostup-linked.se','active','hostup','dom_100', now())
      returning id into v_id;
    if (select provider_domain_id from public.domains where id=v_id) <> 'dom_100'
      then raise exception 'H1 FAIL: admin could not link hostup domain'; end if;
  end $$;
rollback;

-- H2 · CUSTOMER can READ their OWN linked Hostup domain
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer',
            '00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1',
            'own-hostup.se','active','hostup','dom_200');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e1') <> 1
      then raise exception 'H2 FAIL: customer cannot read own linked hostup domain'; end if;
  end $$;
rollback;

-- H3 · CUSTOMER CANNOT read ANOTHER customer's linked Hostup domain (count 0)
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
  insert into public.domains(id,customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000c2',
            'other-hostup.se','active','hostup','dom_300');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';  -- PU1 probing CU2
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e2') <> 0
      then raise exception 'H3 FAIL: customer saw another customer hostup domain'; end if;
  end $$;
rollback;

-- H4 · CUSTOMER CANNOT set registrar/provider_domain_id (RLS write admin-only -> 0 rows)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer',
            '00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','link-me.se','active');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';
  do $$ declare n int; begin
    update public.domains set provider_domain_id='dom_hack', registrar='hostup'
      where id='00000000-0000-0000-0000-0000000000e1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'H4 FAIL: customer set provider_domain_id (% rows)', n; end if;
  end $$;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';  -- verify as admin
  do $$ begin
    if (select provider_domain_id from public.domains where id='00000000-0000-0000-0000-0000000000e1') is not null
      then raise exception 'H4b FAIL: provider_domain_id was mutated'; end if;
  end $$;
rollback;

-- H5 · STAFF has NO access to Hostup-linked domains (SELECT 0; INSERT blocked)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-000000000051','stf@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active'),
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(id,customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000c1','staff-nope.se','active','hostup','dom_400');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare ok boolean:=false; begin
    if (select count(*) from public.domains) <> 0 then raise exception 'H5a FAIL: staff saw hostup domains'; end if;
    begin
      insert into public.domains(customer_id,name,status,registrar,provider_domain_id)
        values ('00000000-0000-0000-0000-0000000000c1','staff-link.se','active','hostup','dom_401'); ok:=true;
    exception when insufficient_privilege or check_violation then ok:=false; end;
    if ok then raise exception 'H5b FAIL: staff linked a hostup domain'; end if;
  end $$;
rollback;

-- H6 · UNIQUE (registrar, provider_domain_id) prevents DOUBLE-LINK of one Hostup id
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by) values
    ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0'),
    ('00000000-0000-0000-0000-0000000000c2','B','B','customer','00000000-0000-0000-0000-0000000000a0');
  insert into public.domains(customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000c1','first-link.se','active','hostup','dom_500');
  do $$ declare ok boolean:=false; begin
    begin
      insert into public.domains(customer_id,name,status,registrar,provider_domain_id)
        values ('00000000-0000-0000-0000-0000000000c2','second-link.se','active','hostup','dom_500'); ok:=true;
    exception when unique_violation then ok:=false; end;
    if ok then raise exception 'H6 FAIL: same (registrar,provider_domain_id) linked twice'; end if;
  end $$;
rollback;

-- H7 · NULLABLE customer_id row is INVISIBLE to a customer (0) but VISIBLE to admin (1)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  -- unlinked discovered domain: customer_id NULL
  insert into public.domains(id,customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000e9', null,'unlinked-hostup.se','active','hostup','dom_900');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000d1';  -- customer
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e9') <> 0
      then raise exception 'H7a FAIL: customer saw an unlinked (null customer_id) domain'; end if;
  end $$;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';  -- admin
  do $$ begin
    if (select count(*) from public.domains where id='00000000-0000-0000-0000-0000000000e9') <> 1
      then raise exception 'H7b FAIL: admin cannot see unlinked domain'; end if;
  end $$;
rollback;

-- H8 · provider enum: 'hostup' accepted, 'openprovider' rejected by the new CHECK
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.customers(id,first_name,last_name,status,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer','00000000-0000-0000-0000-0000000000a0');
  do $$ declare ok boolean:=false; begin
    -- hostup is accepted
    insert into public.domains(customer_id,name,status,registrar)
      values ('00000000-0000-0000-0000-0000000000c1','ok-hostup.se','active','hostup');
    -- openprovider (legacy) is rejected
    begin
      insert into public.domains(customer_id,name,status,registrar)
        values ('00000000-0000-0000-0000-0000000000c1','legacy.se','active','openprovider'); ok:=true;
    exception when check_violation then ok:=false; end;
    if ok then raise exception 'H8 FAIL: openprovider still accepted'; end if;
  end $$;
rollback;

-- H9 · link_hostup_domain RPC is admin-only (staff caller raises)
begin;
  insert into auth.users(id,email) values
    ('00000000-0000-0000-0000-0000000000a0','adm@x.se'),
    ('00000000-0000-0000-0000-000000000051','stf@x.se'),
    ('00000000-0000-0000-0000-0000000000d1','pu1@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',   true,'active'),
    ('00000000-0000-0000-0000-000000000051','staff',   true,'active'),
    ('00000000-0000-0000-0000-0000000000d1','customer',true,'active') on conflict (user_id) do nothing;
  insert into public.customers(id,first_name,last_name,status,portal_user_id,created_by)
    values ('00000000-0000-0000-0000-0000000000c1','A','A','customer',
            '00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a0');
  -- staff caller -> P0001
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare ok boolean:=false; begin
    begin perform public.link_hostup_domain('dom_700','00000000-0000-0000-0000-0000000000c1','rpc-link.se'); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'H9a FAIL: staff called link_hostup_domain'; end if;
  end $$;
  -- admin caller links a portal customer successfully + audit written
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare res jsonb; v_id uuid; n int; begin
    res := public.link_hostup_domain('dom_700','00000000-0000-0000-0000-0000000000c1','rpc-link.se',
             'ord_1','active', now(), true, false, array['ns1.hostup.se']);
    v_id := (res->>'domain_id')::uuid;
    if (select provider_domain_id from public.domains where id=v_id) <> 'dom_700'
      then raise exception 'H9b FAIL: link did not set provider_domain_id'; end if;
    if (select customer_id from public.domains where id=v_id) <> '00000000-0000-0000-0000-0000000000c1'
      then raise exception 'H9c FAIL: link did not set customer_id'; end if;
    -- idempotent re-link to the same customer
    res := public.link_hostup_domain('dom_700','00000000-0000-0000-0000-0000000000c1','rpc-link.se');
    if (res->>'status') <> 'already_linked'
      then raise exception 'H9d FAIL: re-link not idempotent (%)', res->>'status'; end if;
  end $$;
rollback;

-- H10 · link_hostup_domain refuses to reassign a domain already linked to ANOTHER customer
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
  insert into public.domains(customer_id,name,status,registrar,provider_domain_id)
    values ('00000000-0000-0000-0000-0000000000c1','taken.se','active','hostup','dom_800');
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare ok boolean:=false; begin
    begin perform public.link_hostup_domain('dom_800','00000000-0000-0000-0000-0000000000c2','taken.se'); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'H10 FAIL: domain silently reassigned to another customer'; end if;
    -- ownership unchanged
    if (select customer_id from public.domains where registrar='hostup' and provider_domain_id='dom_800')
         <> '00000000-0000-0000-0000-0000000000c1'
      then raise exception 'H10b FAIL: ownership changed'; end if;
  end $$;
rollback;

select '===== ALL HOSTUP LINK TESTS PASSED =====' as result;

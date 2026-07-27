-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3A · log_hostup_event extended allowlist (domain-search/preview audit).
-- Idiom matches 71_hostup_link_tests.sql: self-seeding, literal UUIDs,
--   set local role authenticated; do $$ raise on fail $$; rollback.
-- Depends on 20260729000000_hostup_search_audit.
-- Identities: admin ..a0; staff ..51.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- S1 · ADMIN can log the new search/preview actions (rows written to audit_log)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare n int; begin
    perform public.log_hostup_event('DOMAIN_AVAILABILITY_CHECKED', null, null, null, 'success', '{"domain_count":1}'::jsonb);
    perform public.log_hostup_event('DOMAIN_BULK_AVAILABILITY_CHECKED', null, null, null, 'success', '{"domain_count":5}'::jsonb);
    perform public.log_hostup_event('DOMAIN_ORDER_PREVIEWED', null, null, null, 'success', '{"item_count":1}'::jsonb);
    perform public.log_hostup_event('HOSTUP_AVAILABILITY_FAILED', null, null, null, 'error', '{}'::jsonb);
    perform public.log_hostup_event('HOSTUP_ORDER_PREVIEW_FAILED', null, null, null, 'error', '{}'::jsonb);
    select count(*) into n from public.audit_log
      where action in ('DOMAIN_AVAILABILITY_CHECKED','DOMAIN_BULK_AVAILABILITY_CHECKED',
                       'DOMAIN_ORDER_PREVIEWED','HOSTUP_AVAILABILITY_FAILED','HOSTUP_ORDER_PREVIEW_FAILED');
    if n <> 5 then raise exception 'S1 FAIL: expected 5 audit rows, got %', n; end if;
  end $$;
rollback;

-- S2 · the pre-existing Hostup actions still work (regression)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare n int; begin
    perform public.log_hostup_event('HOSTUP_DOMAIN_SYNCED', null, null, null, 'success', '{}'::jsonb);
    select count(*) into n from public.audit_log where action='HOSTUP_DOMAIN_SYNCED';
    if n <> 1 then raise exception 'S2 FAIL: legacy action rows=%', n; end if;
  end $$;
rollback;

-- S3 · STAFF caller is rejected (not admin, not service_role)
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-000000000051','stf@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-000000000051','staff',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
  do $$ declare ok boolean:=false; begin
    begin perform public.log_hostup_event('DOMAIN_AVAILABILITY_CHECKED'); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'S3 FAIL: staff logged a Hostup event'; end if;
  end $$;
rollback;

-- S4 · an unknown action is rejected even for admin
begin;
  insert into auth.users(id,email) values ('00000000-0000-0000-0000-0000000000a0','adm@x.se') on conflict do nothing;
  insert into public.profiles(user_id,role,is_active,account_status) values
    ('00000000-0000-0000-0000-0000000000a0','admin',true,'active') on conflict (user_id) do nothing;
  set local role authenticated;
  set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
  do $$ declare ok boolean:=false; begin
    begin perform public.log_hostup_event('NOT_A_REAL_ACTION'); ok:=true;
    exception when sqlstate 'P0001' then ok:=false; end;
    if ok then raise exception 'S4 FAIL: invalid action accepted'; end if;
  end $$;
rollback;

select '===== ALL HOSTUP SEARCH AUDIT TESTS PASSED =====' as result;

-- ════════════════════════════════════════════════════════════════════════════
-- Staff Management v1 tests. Each test = one transaction, ROLLED BACK.
-- Reuses harness fixtures: admin a0 (..a0), admin a1 (..a1), staff s1 (..51),
-- staff s2 (..52), suspended (..55), future-start (..f0), past-end (..fa).
-- Literal UUIDs used throughout (psql \set vars are NOT interpolated inside $$).
-- Depends on 20260714120000_staff_management.sql.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- SM1 · new staff profile columns exist
begin;
do $$ begin
  perform 1 from information_schema.columns
    where table_schema='public' and table_name='profiles'
      and column_name in ('address_line','postal_code','city','country','job_title')
    group by table_name having count(*) = 5;
  if not found then raise exception 'SM1 FAIL: missing staff profile columns'; end if;
end $$;
rollback;

-- SM2 · account_status CHECK allows 'ended' (write it as admin, RLS bypassed via superuser context here)
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000e001','sm2@x.se') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status)
  values ('00000000-0000-0000-0000-00000000e001','staff', false, 'ended');
do $$ begin
  if (select account_status from public.profiles where user_id='00000000-0000-0000-0000-00000000e001') <> 'ended'
    then raise exception 'SM2 FAIL: ended not stored'; end if;
end $$;
rollback;

-- SM3 · account_status CHECK rejects an invalid value
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000e002','sm3@x.se') on conflict do nothing;
do $$ declare ok boolean:=false; begin
  begin insert into public.profiles(user_id, account_status)
    values ('00000000-0000-0000-0000-00000000e002','bogus'); ok:=true;
  exception when check_violation then ok:=false; end;
  if ok then raise exception 'SM3 FAIL: invalid account_status accepted'; end if;
end $$;
rollback;

-- SM4 · set_user_permissions is ADMIN-ONLY: staff caller raises
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare ok boolean:=false; begin
  begin perform public.set_user_permissions('00000000-0000-0000-0000-000000000052', array['crm.access']); ok:=true;
  exception when insufficient_privilege then ok:=false; end;
  if ok then raise exception 'SM4 FAIL: staff called set_user_permissions'; end if;
end $$; rollback;

-- SM5 · set_user_permissions atomically REPLACES the full set (admin caller)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare cnt int; has_view boolean; has_create boolean; begin
  -- s3 starts with {customers.view_own, quotes.view_own}; replace with a new set
  perform public.set_user_permissions('00000000-0000-0000-0000-000000000053',
    array['crm.access','customers.create']);
  select count(*) into cnt from public.user_permissions where user_id='00000000-0000-0000-0000-000000000053';
  if cnt <> 2 then raise exception 'SM5 FAIL: expected 2 perms, got %', cnt; end if;
  select exists(select 1 from public.user_permissions
    where user_id='00000000-0000-0000-0000-000000000053' and permission='customers.view_own') into has_view;
  select exists(select 1 from public.user_permissions
    where user_id='00000000-0000-0000-0000-000000000053' and permission='customers.create') into has_create;
  if has_view then raise exception 'SM5 FAIL: old permission not removed'; end if;
  if not has_create then raise exception 'SM5 FAIL: new permission not present'; end if;
end $$; rollback;

-- SM6 · set_user_permissions rejects an INVALID permission (whole call fails, atomic)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; cnt int; begin
  begin perform public.set_user_permissions('00000000-0000-0000-0000-000000000053',
    array['crm.access','not.a.real.permission']); ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM6 FAIL: invalid permission accepted'; end if;
  -- original set of s3 must be unchanged (2 perms)
  select count(*) into cnt from public.user_permissions where user_id='00000000-0000-0000-0000-000000000053';
  if cnt <> 2 then raise exception 'SM6 FAIL: set mutated on error (cnt=%)', cnt; end if;
end $$; rollback;

-- SM7 · INSERT audit writes a 'staff.invited' row (admin jwt context)
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000e007','invite@x.se') on conflict do nothing;
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare n int; begin
  insert into public.profiles(user_id, role, is_active, account_status, email)
    values ('00000000-0000-0000-0000-00000000e007','staff', false, 'invited','invite@x.se');
  select count(*) into n from public.audit_log
    where action='staff.invited' and target_type='profiles'
      and target_id='00000000-0000-0000-0000-00000000e007';
  if n <> 1 then raise exception 'SM7 FAIL: staff.invited audit rows=%', n; end if;
end $$; rollback;

-- SM8 · last active admin cannot be SUSPENDED (a0 is last active admin after a1 demote)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a1'; -- a0 now last admin
  begin update public.profiles set account_status='suspended' where user_id='00000000-0000-0000-0000-0000000000a0'; ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM8 FAIL: suspended last admin'; end if;
end $$; rollback;

-- SM9 · last active admin cannot be ENDED
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a1';
  begin update public.profiles set account_status='ended' where user_id='00000000-0000-0000-0000-0000000000a0'; ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM9 FAIL: ended last admin'; end if;
end $$; rollback;

-- SM10 · last active admin cannot be DEACTIVATED (is_active=false)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a1';
  begin update public.profiles set is_active=false where user_id='00000000-0000-0000-0000-0000000000a0'; ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM10 FAIL: deactivated last admin'; end if;
end $$; rollback;

-- SM11 · last active admin cannot be DEMOTED to staff.
--   a0 (actor) demotes a1 -> allowed (a0 remains). a0 then attempts to demote a0
--   (the last active admin) -> blocked (self-role guard AND last-admin guard both
--   raise P0001; either way the demotion of the last active admin is refused).
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a1'; -- allowed
  begin update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a0'; ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM11 FAIL: demoted last active admin'; end if;
end $$; rollback;

-- SM12 · staff cannot change OWN role (via profiles_write RLS: staff not admin -> 0 rows / denied)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare n int; begin
  update public.profiles set role='admin' where user_id='00000000-0000-0000-0000-000000000051';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'SM12 FAIL: staff changed own role (% rows)', n; end if;
end $$; rollback;

-- SM13 · an admin cannot change their OWN role (protect_profiles self-role guard)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare ok boolean:=false; begin
  begin update public.profiles set role='staff' where user_id='00000000-0000-0000-0000-0000000000a0'; ok:=true;
  exception when sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM13 FAIL: self role change allowed'; end if;
end $$; rollback;

-- SM14 · staff cannot MODIFY own user_permissions (RLS perms_write is admin-only)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare ok boolean:=false; n int; begin
  -- INSERT a new perm for self -> denied
  begin insert into public.user_permissions(user_id, permission)
    values ('00000000-0000-0000-0000-000000000051','quotes.create'); ok:=true;
  exception when insufficient_privilege or sqlstate 'P0001' then ok:=false; end;
  if ok then raise exception 'SM14a FAIL: staff inserted own permission'; end if;
  -- DELETE own perm -> 0 rows affected (RLS filters it out)
  delete from public.user_permissions
    where user_id='00000000-0000-0000-0000-000000000051' and permission='crm.access';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'SM14b FAIL: staff deleted own permission (% rows)', n; end if;
end $$; rollback;

-- SM15 · SUSPENDED staff has NO access to business data or own profile
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000055';
do $$ begin
  if (select count(*) from public.profiles where user_id='00000000-0000-0000-0000-000000000055') <> 0
    then raise exception 'SM15a FAIL: suspended saw own profile'; end if;
  if (select count(*) from public.customers) <> 0
    then raise exception 'SM15b FAIL: suspended saw customers'; end if;
end $$; rollback;

-- SM16 · ENDED staff has NO access to business data or own profile
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000e016','ended@x.se') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status)
  values ('00000000-0000-0000-0000-00000000e016','staff', true, 'ended');
-- give ended user perms so the ONLY thing blocking access is account_status
insert into public.user_permissions(user_id, permission)
  values ('00000000-0000-0000-0000-00000000e016','customers.view_own');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000e016';
do $$ begin
  if (select count(*) from public.profiles where user_id='00000000-0000-0000-0000-00000000e016') <> 0
    then raise exception 'SM16a FAIL: ended saw own profile'; end if;
  if (select count(*) from public.customers) <> 0
    then raise exception 'SM16b FAIL: ended saw customers'; end if;
end $$; rollback;

select '===== ALL STAFF TESTS PASSED =====' as result;

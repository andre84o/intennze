-- ════════════════════════════════════════════════════════════════════════════
-- customer_interactions DELETE hardening tests. Each test = one transaction,
-- ROLLED BACK. Proves the migration 20260714130000_restrict_interactions_delete
-- _to_admin.sql makes DELETE admin-only, and that SELECT/INSERT/UPDATE keep
-- their Release B semantics.
--
-- Effective RLS on public.customer_interactions after Release B + this migration
-- (from proposed/20260620_b_rls.sql + 20260714130000):
--   SELECT : is_admin() OR (is_active_user() AND owns customer AND not archived)
--   INSERT : is_admin() OR (is_active_user() AND owns customer AND not archived)
--            (no dedicated permission required — active + ownership is enough)
--   UPDATE : is_admin()  ONLY  (staff cannot update; see ID6/ID7 finding)
--   DELETE : is_admin()  ONLY  (this migration)
--   is_active_user() requires account_status='active' (suspended/ended fail).
--
-- Fixtures (10_seed.sql): admin a0 (..a0); staff s1 (..51, owns c1, full perms);
-- staff s2 (..52, owns c2); staff s3 (..53, owns c3, limited perms); suspended
-- (..55); customers c1 (..0c1 owned by s1), c2 (..0c2 owned by s2), c3 (..0c3
-- owned by s3); seeded interaction b1 (..0b1) on c1.
-- Literal UUIDs throughout (psql \set vars are NOT interpolated inside $$).
-- NB: customer_interactions has NO audit trigger (audit triggers exist only on
--     profiles and user_permissions), so DELETE is NOT audit-logged — item (12)
--     is not applicable and is intentionally skipped.
-- ════════════════════════════════════════════════════════════════════════════
\set ON_ERROR_STOP on

-- ID1 · ADMIN can DELETE an interaction (row_count = 1)
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ declare n int; begin
  delete from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'ID1 FAIL: admin delete affected % rows (expected 1)', n; end if;
end $$; rollback;

-- ID2 · staff s1 canNOT DELETE its OWN-scope interaction (b1 is on c1, owned by s1)
--   Accept EITHER 0 rows affected OR an RLS error.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare n int; blocked boolean:=false; begin
  begin
    delete from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ID2 FAIL: staff deleted own-scope interaction (% rows)', n; end if;
  exception
    when raise_exception then raise;               -- re-raise our own assertion
    when others then blocked:=true;                -- RLS / privilege error also acceptable
  end;
  -- either path (0 rows or blocked) is a pass; row still present is proven by ID2b
end $$;
-- ID2b · confirm the row survived the blocked staff DELETE (verify as admin)
set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ begin
  if (select count(*) from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1') <> 1
    then raise exception 'ID2b FAIL: interaction b1 was deleted by staff'; end if;
end $$; rollback;

-- ID3 · staff canNOT DELETE ANOTHER staff's interaction.
--   Seed an interaction on c2 (owned by s2), then s1 (and s3) attempt DELETE.
begin;
insert into public.customer_interactions(id, customer_id, type, description)
  values ('00000000-0000-0000-0000-00000000d002','00000000-0000-0000-0000-0000000000c2','note','on c2');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare n int; blocked boolean:=false; begin
  begin
    delete from public.customer_interactions where id='00000000-0000-0000-0000-00000000d002';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ID3 FAIL: staff deleted another staff interaction (% rows)', n; end if;
  exception
    when raise_exception then raise;
    when others then blocked:=true;
  end;
end $$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ begin
  if (select count(*) from public.customer_interactions where id='00000000-0000-0000-0000-00000000d002') <> 1
    then raise exception 'ID3b FAIL: cross-staff interaction was deleted'; end if;
end $$; rollback;

-- ID4 · staff s1 can still SELECT its permitted interactions (b1 on c1 owned by s1),
--   and canNOT see interactions on customers it does not own.
begin;
insert into public.customer_interactions(id, customer_id, type, description)
  values ('00000000-0000-0000-0000-00000000d003','00000000-0000-0000-0000-0000000000c3','note','on c3');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ begin
  if (select count(*) from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1') <> 1
    then raise exception 'ID4a FAIL: s1 cannot see own-scope interaction b1'; end if;
  if (select count(*) from public.customer_interactions where id='00000000-0000-0000-0000-00000000d003') <> 0
    then raise exception 'ID4b FAIL: s1 saw another staff interaction'; end if;
end $$; rollback;

-- ID5 · staff s1 can still INSERT an interaction on a customer it owns (c1).
--   Real INSERT policy needs only is_active_user() + ownership (no extra perm);
--   s1 is active and owns c1, so this must succeed.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare n int; begin
  insert into public.customer_interactions(id, customer_id, type, description)
    values ('00000000-0000-0000-0000-00000000d005','00000000-0000-0000-0000-0000000000c1','note','s1 note');
  select count(*) into n from public.customer_interactions where id='00000000-0000-0000-0000-00000000d005';
  if n <> 1 then raise exception 'ID5 FAIL: s1 insert on owned customer did not persist'; end if;
end $$; rollback;

-- ID6 · staff s1 canNOT UPDATE an interaction — REAL POLICY FINDING.
--   interactions_update USING (is_admin()) is admin-only; there is NO staff
--   ownership path for UPDATE. So the task's assumed "staff can UPDATE per
--   ownership" is FALSE for this table: staff UPDATE affects 0 rows.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000051';
do $$ declare n int; blocked boolean:=false; begin
  begin
    update public.customer_interactions set description='edited by s1'
      where id='00000000-0000-0000-0000-0000000000b1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ID6 FAIL: staff UPDATE affected % rows (policy is admin-only)', n; end if;
  exception
    when raise_exception then raise;
    when others then blocked:=true;
  end;
end $$; rollback;

-- ID7 · staff s3 (limited perms) is likewise denied INSERT on a customer it does
--   NOT own, and denied UPDATE. s3 owns c3 but not c1; INSERT on c1 must fail the
--   WITH CHECK (ownership), and UPDATE is admin-only.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000053';
do $$ declare ok boolean:=false; n int; begin
  -- INSERT on a customer s3 does not own -> denied (RLS WITH CHECK)
  begin
    insert into public.customer_interactions(id, customer_id, type, description)
      values ('00000000-0000-0000-0000-00000000d007','00000000-0000-0000-0000-0000000000c1','note','x'); ok:=true;
  exception when insufficient_privilege or check_violation then ok:=false; end;
  if ok then raise exception 'ID7a FAIL: s3 inserted interaction on non-owned customer'; end if;
  -- UPDATE (admin-only) -> 0 rows
  update public.customer_interactions set description='e' where id='00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ID7b FAIL: s3 updated an interaction (% rows)', n; end if;
end $$; rollback;

-- ID8 · SUSPENDED staff (..55) cannot SELECT / INSERT / UPDATE / DELETE.
--   account_status='suspended' -> is_active_user() false. Suspended user is given
--   ownership-like context via c1? No — RLS still blocks on activeness regardless.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-000000000055';
do $$ declare n int; ok boolean:=false; begin
  -- SELECT: sees nothing
  if (select count(*) from public.customer_interactions) <> 0
    then raise exception 'ID8a FAIL: suspended saw interactions'; end if;
  -- INSERT: denied (not active)
  begin
    insert into public.customer_interactions(id, customer_id, type, description)
      values ('00000000-0000-0000-0000-00000000d008','00000000-0000-0000-0000-0000000000c1','note','x'); ok:=true;
  exception when insufficient_privilege or check_violation then ok:=false; end;
  if ok then raise exception 'ID8b FAIL: suspended inserted an interaction'; end if;
  -- UPDATE: 0 rows
  update public.customer_interactions set description='e' where id='00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ID8c FAIL: suspended updated an interaction (% rows)', n; end if;
  -- DELETE: 0 rows
  delete from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ID8d FAIL: suspended deleted an interaction (% rows)', n; end if;
end $$; rollback;

-- ID9 · ENDED staff cannot SELECT / INSERT / UPDATE / DELETE.
--   Set an active staff's account_status='ended' in-txn (superuser, RLS bypassed),
--   give it ownership perms so the ONLY blocker is account_status.
begin;
insert into auth.users(id, email) values ('00000000-0000-0000-0000-00000000e009','ended-int@x.se') on conflict do nothing;
insert into public.profiles(user_id, role, is_active, account_status)
  values ('00000000-0000-0000-0000-00000000e009','staff', true, 'ended');
insert into public.user_permissions(user_id, permission)
  values ('00000000-0000-0000-0000-00000000e009','customers.view_own');
-- make ended user own a customer so ownership is not what blocks it
insert into public.customers(id, first_name, last_name, status, owner_user_id, created_by)
  values ('00000000-0000-0000-0000-0000000000c9','C','Nine','customer','00000000-0000-0000-0000-00000000e009','00000000-0000-0000-0000-0000000000a0');
insert into public.customer_interactions(id, customer_id, type, description)
  values ('00000000-0000-0000-0000-00000000d009','00000000-0000-0000-0000-0000000000c9','note','ended note');
set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-00000000e009';
do $$ declare n int; ok boolean:=false; begin
  if (select count(*) from public.customer_interactions) <> 0
    then raise exception 'ID9a FAIL: ended saw interactions'; end if;
  begin
    insert into public.customer_interactions(id, customer_id, type, description)
      values ('00000000-0000-0000-0000-00000000d00a','00000000-0000-0000-0000-0000000000c9','note','x'); ok:=true;
  exception when insufficient_privilege or check_violation then ok:=false; end;
  if ok then raise exception 'ID9b FAIL: ended inserted an interaction'; end if;
  update public.customer_interactions set description='e' where id='00000000-0000-0000-0000-00000000d009';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ID9c FAIL: ended updated an interaction (% rows)', n; end if;
  delete from public.customer_interactions where id='00000000-0000-0000-0000-00000000d009';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'ID9d FAIL: ended deleted an interaction (% rows)', n; end if;
end $$; rollback;

-- ID10 · ANON cannot DELETE (no policy grants anon; role anon).
begin; set local role anon;
do $$ declare n int; blocked boolean:=false; begin
  begin
    delete from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ID10 FAIL: anon deleted an interaction (% rows)', n; end if;
  exception
    when raise_exception then raise;
    when others then blocked:=true;                -- privilege error acceptable
  end;
end $$; rollback;

-- ID11 · authenticated user with NO profile cannot DELETE.
--   'newp' (..de) exists in auth.users but has no profile -> is_admin() false.
begin; set local role authenticated; set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000de';
do $$ declare n int; blocked boolean:=false; begin
  begin
    delete from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1';
    get diagnostics n = row_count;
    if n <> 0 then raise exception 'ID11 FAIL: profileless user deleted an interaction (% rows)', n; end if;
  exception
    when raise_exception then raise;
    when others then blocked:=true;
  end;
end $$;
set local request.jwt.claim.sub='00000000-0000-0000-0000-0000000000a0';
do $$ begin
  if (select count(*) from public.customer_interactions where id='00000000-0000-0000-0000-0000000000b1') <> 1
    then raise exception 'ID11b FAIL: interaction deleted by profileless user'; end if;
end $$; rollback;

select '===== ALL INTERACTIONS DELETE TESTS PASSED =====' as result;

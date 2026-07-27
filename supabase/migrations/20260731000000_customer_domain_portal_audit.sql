-- ════════════════════════════════════════════════════════════════════════════
-- Phase 4 · customer-callable audit for the domain portal.
--
-- log_hostup_event asserts (is_admin() OR service_role), so a REAL customer
-- session cannot write an audit row — the call raises and the service-layer
-- try/catch swallows it (a silent no-op). Customer portal events therefore need a
-- function whose gate ALSO admits an ACTIVE portal customer. This adds
-- log_customer_event with its OWN small CUSTOMER_* allowlist; log_hostup_event is
-- left UNTOUCHED (its admin/service invariant is deliberate). Additive only.
--
-- Both callers work:
--   · REAL customer  → auth.uid() = the customer; gate passes via the customer
--     branch; context='customer'.
--   · ADMIN in customer-view → auth.uid() = the admin (session never swapped);
--     gate passes via is_admin(); the viewed customer travels in p_effective_user_id;
--     context='customer_view'.
--
-- Baselines 20260727..20260730 stay LOCKED. No RLS is weakened; no USING(true).
-- ════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.log_customer_event(
    p_action text,
    p_domain_id uuid default null,
    p_effective_user_id uuid default null,
    p_outcome text default 'success',
    p_metadata jsonb default '{}'::jsonb)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_is_admin boolean := public.is_admin();
  -- An ACTIVE portal customer (profiles.role='customer'), mirroring link_hostup_domain.
  v_is_customer boolean := exists (
    select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and p.role = 'customer'
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
begin
  if not (v_is_admin or v_is_customer or v_is_service) then
    raise exception 'Not authorized to log a customer event.';
  end if;

  if p_action not in (
      'CUSTOMER_DOMAIN_LIST_VIEWED','CUSTOMER_DOMAIN_DETAIL_VIEWED',
      'CUSTOMER_DOMAIN_STATUS_REFRESHED','CUSTOMER_DOMAIN_SEARCH_VIEWED',
      'CUSTOMER_DOMAIN_QUOTE_PREPARED') then
    raise exception 'Invalid customer event action: %', p_action;
  end if;

  if coalesce(p_outcome,'success') not in ('success','blocked','error') then
    raise exception 'Invalid outcome: %', p_outcome;
  end if;

  insert into public.audit_log(actor_user_id, actor_email, actor_role, action,
    target_type, target_id, target_label, before, after, ip, user_agent, outcome)
  values (
    (select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    (select role  from public.profiles where user_id = (select auth.uid())),
    p_action, 'domain',
    case when p_domain_id is null then null else p_domain_id::text end,
    null, null,
    public.redact(
      coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object(
           'effective_user_id', p_effective_user_id,
           'context', case
                        when v_is_service then 'service'
                        when v_is_admin   then 'customer_view'  -- admin previewing
                        else 'customer' end)),
    null, null, coalesce(p_outcome,'success'));
end $$;

revoke execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) from public;
grant  execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) to authenticated;
grant  execute on function public.log_customer_event(text,uuid,uuid,text,jsonb) to service_role;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.log_customer_event(text,uuid,uuid,text,jsonb);

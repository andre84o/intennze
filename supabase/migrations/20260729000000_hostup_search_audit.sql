-- ════════════════════════════════════════════════════════════════════════════
-- Phase 3A · extend log_hostup_event with domain-search/preview audit actions.
--
-- log_hostup_event (from 20260728000000) hard-codes an action allowlist, so the
-- new read-only search/preview events would be rejected. This CREATE OR REPLACE
-- keeps the exact same signature, security model, grants, and body — it only
-- widens the action allowlist. Baselines 20260727000000 + 20260728000000 stay
-- untouched. No schema/table change; no new scope.
-- ════════════════════════════════════════════════════════════════════════════

begin;

create or replace function public.log_hostup_event(
    p_action text,
    p_domain_id uuid default null,
    p_provider_domain_id text default null,
    p_effective_user_id uuid default null,
    p_outcome text default 'success',
    p_metadata jsonb default '{}'::jsonb)
  returns void
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
begin
  if not (public.is_admin() or v_is_service) then
    raise exception 'Not authorized to log a Hostup event.';
  end if;

  if p_action not in (
      'HOSTUP_DOMAIN_SYNCED','HOSTUP_DOMAIN_LINKED_TO_CUSTOMER','HOSTUP_SYNC_FAILED',
      'DOMAIN_AVAILABILITY_CHECKED','DOMAIN_BULK_AVAILABILITY_CHECKED','DOMAIN_ORDER_PREVIEWED',
      'HOSTUP_AVAILABILITY_FAILED','HOSTUP_ORDER_PREVIEW_FAILED') then
    raise exception 'Invalid Hostup action: %', p_action;
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
           'provider_domain_id', p_provider_domain_id,
           'effective_user_id',  p_effective_user_id,
           'context', case when v_is_service then 'service' else 'admin' end)),
    null, null, coalesce(p_outcome,'success'));
end $$;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- Re-apply the 20260728000000 version of log_hostup_event (allowlist without the
-- DOMAIN_* / HOSTUP_*_FAILED search actions).

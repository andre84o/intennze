-- ════════════════════════════════════════════════════════════════════════════
-- Phase 5B · multi-item cart: MANY orders may share ONE Stripe Checkout Session.
--
-- The cart lets a customer pay for several domains in a single Stripe session.
-- Each domain is still its own domain_orders row (one domain per order), but they
-- now share the session id, and the webhook settles ALL of them together.
--
-- Baselines 20260727..20260731000003 are LOCKED. Additive forward migration only.
-- No RLS is weakened; no USING(true) policy. Settlement stays service_role-only
-- and idempotent (row-level status guard; a Stripe re-delivery is a safe no-op).
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- 1) Relax "one order per session" → allow a shared session across a cart.
--    Idempotency no longer rests on this unique index; it rests on the per-row
--    status guard in the settlement RPCs below (only DRAFT/CHECKOUT_CREATED
--    advance). Keep a NON-unique index for the session lookup.
drop index if exists public.uq_domain_orders_stripe_session;
create index if not exists idx_domain_orders_stripe_session
  on public.domain_orders (stripe_session_id) where stripe_session_id is not null;

-- 2) Settle ALL orders for a session (was: exactly one). Return the count settled.
--    Return type changes uuid → integer, so DROP then CREATE.
drop function if exists public.mark_domain_order_paid(text,text);
create function public.mark_domain_order_paid(
    p_session_id text, p_payment_intent_id text)
  returns integer
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_count integer;
begin
  if not v_is_service then raise exception 'Only the service role can settle an order.'; end if;
  -- Idempotent: only advance rows still in a pre-payment state; re-delivery = 0 rows.
  with upd as (
    update public.domain_orders
       set status = 'PAID_AWAITING_REGISTRATION',
           paid_at = now(),
           stripe_payment_intent_id = coalesce(stripe_payment_intent_id, p_payment_intent_id)
     where stripe_session_id = p_session_id
       and status in ('DRAFT','CHECKOUT_CREATED')
     returning 1)
  select count(*)::int into v_count from upd;
  return v_count;
end $$;
-- Settlement is service_role-only. Revoke the default PUBLIC grant AND any
-- Supabase default-privilege grant to anon/authenticated (belt-and-suspenders;
-- the body also guards on the service role).
revoke execute on function public.mark_domain_order_paid(text,text) from public, anon, authenticated;
grant  execute on function public.mark_domain_order_paid(text,text) to service_role;

-- 3) Mark ALL orders for a session failed / expired / cancelled (never overrides paid).
drop function if exists public.mark_domain_order_terminal(text,text);
create function public.mark_domain_order_terminal(
    p_session_id text, p_status text)
  returns integer
  language plpgsql security definer set search_path = ''
as $$
declare
  v_is_service boolean :=
    coalesce((nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role') = 'service_role', false);
  v_count integer;
begin
  if not v_is_service then raise exception 'Only the service role can update an order.'; end if;
  if p_status not in ('PAYMENT_FAILED','EXPIRED','CANCELLED') then raise exception 'Invalid terminal status.'; end if;
  with upd as (
    update public.domain_orders
       set status = p_status
     where stripe_session_id = p_session_id
       and status in ('DRAFT','CHECKOUT_CREATED')
     returning 1)
  select count(*)::int into v_count from upd;
  return v_count;
end $$;
revoke execute on function public.mark_domain_order_terminal(text,text) from public, anon, authenticated;
grant  execute on function public.mark_domain_order_terminal(text,text) to service_role;

commit;

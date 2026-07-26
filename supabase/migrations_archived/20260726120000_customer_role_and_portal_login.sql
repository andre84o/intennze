-- ════════════════════════════════════════════════════════════════════════════
-- Customer portal foundation
--   · widen profiles.role to allow 'customer'
--   · audit helper for the admin "customer-view" (portal impersonation) events
-- Minimal + reversible. NO domain models, NO RLS weakening, NO backfill.
-- Existing 'admin'/'staff' rows and the 'staff' default are untouched.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── widen role CHECK to include 'customer' ───────────────────────────────────
-- The roles foundation (20260713213000) defines role as a single INLINE (unnamed)
-- CHECK, which Postgres auto-names `profiles_role_check`. Drop + re-add widened.
-- A new customer row must set role explicitly (the column default stays 'staff').
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('admin','staff','customer'));

-- ── audit helper for admin customer-view (start / exit) ──────────────────────
-- SECURITY DEFINER so it can append to the append-only audit_log (which has no
-- INSERT policy for the `authenticated` role). It is SAFE to grant to
-- `authenticated` because it:
--   • hard-codes actor_user_id = auth.uid()  → an actor can never be forged;
--   • asserts the caller is an ACTIVE ADMIN (public.is_admin());
--   • restricts p_action to the two allowed values;
--   • validates the target customer exists.
-- This lets the admin's OWN session write the audit row (actor = the real admin),
-- so no service-role key ever enters the Next.js customer-view flow.
create or replace function public.log_customer_view(
    p_customer_id uuid,
    p_action text,
    p_ip text default null,
    p_user_agent text default null)
  returns void
  language plpgsql
  security definer
  set search_path = ''
as $$
declare v_label text;
begin
  if not public.is_admin() then
    raise exception 'Only an active admin can log a customer-view event.';
  end if;

  if p_action not in ('customer_view.start','customer_view.exit') then
    raise exception 'Invalid customer-view action: %', p_action;
  end if;

  -- Validate the customer exists and derive a human label for the audit row.
  select coalesce(nullif(btrim(coalesce(c.company_name, '')), ''),
                  btrim(c.first_name || ' ' || c.last_name))
    into v_label
    from public.customers c
   where c.id = p_customer_id;

  if v_label is null then
    raise exception 'Customer not found.';
  end if;

  insert into public.audit_log(actor_user_id, actor_email, actor_role, action,
    target_type, target_id, target_label, before, after, ip, user_agent, outcome)
  values ((select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    (select role  from public.profiles where user_id = (select auth.uid())),
    p_action, 'customer', p_customer_id::text, v_label,
    null, jsonb_build_object('customer_id', p_customer_id), p_ip, p_user_agent, 'success');
end $$;

revoke execute on function public.log_customer_view(uuid,text,text,text) from public;
grant  execute on function public.log_customer_view(uuid,text,text,text) to authenticated;

commit;

-- ── Reverse (manual) ─────────────────────────────────────────────────────────
-- drop function if exists public.log_customer_view(uuid,text,text,text);
-- -- only safe once no rows have role='customer':
-- alter table public.profiles drop constraint if exists profiles_role_check;
-- alter table public.profiles
--   add constraint profiles_role_check check (role in ('admin','staff'));

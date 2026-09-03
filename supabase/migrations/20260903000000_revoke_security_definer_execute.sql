-- ════════════════════════════════════════════════════════════════════════════
-- Security: revoke EXECUTE on SECURITY DEFINER functions from anon / authenticated
-- (forward-only migration; REVOKE is idempotent if the grant no longer exists)
--
-- Background
-- ──────────
-- Supabase exposes every function in the public schema via /rest/v1/rpc/*.
-- PostgreSQL's default is EXECUTE granted to PUBLIC, so anon and authenticated
-- can invoke them directly over HTTP — even functions that are only meant to be
-- called by database triggers or from within other SECURITY DEFINER functions.
--
-- This migration tightens grants in three passes:
--
--   A. Trigger functions (14)
--      Registered as BEFORE/AFTER trigger handlers (RETURNS trigger).
--      Never called via RPC; revoking from both anon and authenticated is safe.
--
--   B. Internal-only helpers (4: log_audit, log_security_event,
--      commission_rate_for, current_open_commission_period)
--      Invoked exclusively from inside other SECURITY DEFINER functions, which
--      execute as the function owner (postgres). The caller role never needs
--      direct EXECUTE on these.
--
--   C. Application / admin functions (14)
--      Called from server-side Next.js (Server Actions, server-only libs) using
--      the logged-in user's session JWT — i.e. as the `authenticated` role.
--      Cannot revoke from authenticated without breaking the app.
--      Revoke from anon only: unauthenticated callers have no legitimate use.
--
-- NOT touched
-- ──────────
-- RLS helper functions (is_admin, is_active_user, has_permission,
-- is_portal_customer_of) are left as-is. They are called by RLS policies that
-- may fire for any role; revoking could turn a silent policy-deny into a hard
-- "permission denied for function" error.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── A. Trigger functions — revoke from anon + authenticated ─────────────────

revoke execute on function public.audit_domain_change()              from anon, authenticated;
revoke execute on function public.audit_domain_registrant_change()   from anon, authenticated;
revoke execute on function public.audit_permission_change()          from anon, authenticated;
revoke execute on function public.audit_profile_change()             from anon, authenticated;
revoke execute on function public.audit_profile_insert()             from anon, authenticated;
revoke execute on function public.protect_customer_columns()         from anon, authenticated;
revoke execute on function public.protect_invoice_salesperson()      from anon, authenticated;
revoke execute on function public.protect_profiles()                 from anon, authenticated;
revoke execute on function public.protect_quote_fields()             from anon, authenticated;
revoke execute on function public.protect_quote_insert()             from anon, authenticated;
revoke execute on function public.quote_items_recalc()               from anon, authenticated;
revoke execute on function public.quotes_vat_recalc()                from anon, authenticated;
revoke execute on function public.sync_email_on_preferences_insert() from anon, authenticated;
revoke execute on function public.sync_user_email_to_preferences()   from anon, authenticated;

-- ── B. Internal-only helpers — revoke from anon + authenticated ─────────────
-- These are called only from inside SECURITY DEFINER functions that run as
-- postgres. No application code calls them directly via .rpc().

revoke execute on function
  public.log_audit(
    p_action      text,
    p_target_type text,
    p_target_id   text,
    p_target_label text,
    p_before      jsonb,
    p_after       jsonb,
    p_ip          text,
    p_user_agent  text,
    p_outcome     text
  )
  from anon, authenticated;

revoke execute on function
  public.log_security_event(
    p_actor_user_id uuid,
    p_action        text,
    p_target_type   text,
    p_target_id     text,
    p_target_label  text,
    p_before        jsonb,
    p_after         jsonb,
    p_ip            text,
    p_user_agent    text,
    p_outcome       text
  )
  from anon, authenticated;

revoke execute on function
  public.commission_rate_for(p_user_id uuid, p_revenue numeric)
  from anon, authenticated;

revoke execute on function
  public.current_open_commission_period(p_user_id uuid)
  from anon, authenticated;

-- ── C. Application / admin functions — revoke from anon only ────────────────
-- Server Actions and server-only libs use the session-based Supabase client
-- (anon key + user cookie = authenticated role), so authenticated must keep
-- EXECUTE. Anon has no legitimate reason to call any of these.

revoke execute on function
  public.attach_domain_order_checkout(p_order_id uuid, p_session_id text)
  from anon;

revoke execute on function
  public.create_domain_order(
    p_domain_name            text,
    p_operation              text,
    p_years                  integer,
    p_net_amount_minor       integer,
    p_vat_amount_minor       integer,
    p_gross_amount_minor     integer,
    p_vat_rate_basis_points  integer,
    p_quote_snapshot         jsonb,
    p_currency_code          text,
    p_customer_id            uuid,
    p_registrant_details     jsonb
  )
  from anon;

revoke execute on function
  public.create_domain_pricing_rule(
    p_operation                      text,
    p_calculation_type               text,
    p_tld                            text,
    p_fixed_customer_price_minor     bigint,
    p_fixed_price_years              integer,
    p_markup_fixed_minor             bigint,
    p_markup_percentage_basis_points integer,
    p_minimum_customer_price_minor   bigint,
    p_currency_code                  text,
    p_applies_to_premium             boolean,
    p_starts_at                      timestamp with time zone,
    p_ends_at                        timestamp with time zone
  )
  from anon;

revoke execute on function
  public.create_manual_domain(
    p_customer_id   uuid,
    p_name          text,
    p_status        text,
    p_registered_at timestamp with time zone,
    p_expires_at    timestamp with time zone,
    p_auto_renew    boolean,
    p_locked        boolean,
    p_nameservers   text[],
    p_registrant    jsonb
  )
  from anon;

revoke execute on function
  public.get_active_domain_pricing_rules(
    p_currency  text,
    p_operation text,
    p_tld       text,
    p_premium   boolean,
    p_at        timestamp with time zone
  )
  from anon;

revoke execute on function
  public.get_portal_customer_contact(p_customer_id uuid)
  from anon;

revoke execute on function
  public.link_hostup_domain(
    p_provider_domain_id text,
    p_customer_id        uuid,
    p_name               text,
    p_order_id           text,
    p_status             text,
    p_expires_at         timestamp with time zone,
    p_auto_renew         boolean,
    p_locked             boolean,
    p_nameservers        text[]
  )
  from anon;

revoke execute on function
  public.log_customer_event(
    p_action            text,
    p_domain_id         uuid,
    p_effective_user_id uuid,
    p_outcome           text,
    p_metadata          jsonb
  )
  from anon;

revoke execute on function
  public.log_customer_view(
    p_customer_id uuid,
    p_action      text,
    p_ip          text,
    p_user_agent  text
  )
  from anon;

revoke execute on function
  public.log_hostup_event(
    p_action            text,
    p_domain_id         uuid,
    p_provider_domain_id text,
    p_effective_user_id uuid,
    p_outcome           text,
    p_metadata          jsonb
  )
  from anon;

revoke execute on function
  public.set_domain_pricing_rule_active(p_id uuid, p_active boolean)
  from anon;

revoke execute on function
  public.update_domain_pricing_rule(
    p_id                             uuid,
    p_calculation_type               text,
    p_fixed_customer_price_minor     bigint,
    p_fixed_price_years              integer,
    p_markup_fixed_minor             bigint,
    p_markup_percentage_basis_points integer,
    p_minimum_customer_price_minor   bigint,
    p_starts_at                      timestamp with time zone,
    p_ends_at                        timestamp with time zone
  )
  from anon;

commit;


-- psql restrict directive removed for migration compatibility


SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."approve_commission_period"("p_period_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_period      public.commission_periods%rowtype;
  v_revenue     numeric(14,2);
  v_rate        numeric(5,2);
  v_earned      numeric(14,2);
  v_adjustments numeric(14,2);
  v_final       numeric(14,2);
begin
  if not public.is_admin() then
    raise exception 'Only an admin can approve a commission period.' using errcode = '42501';
  end if;

  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.status <> 'open' then
    raise exception 'Period is already % and cannot be approved.', v_period.status using errcode = 'P0001';
  end if;

  select coalesce(sum(ce.amount_ex_vat_snapshot), 0)::numeric(14,2) into v_revenue
    from public.commission_entries ce
    where ce.user_id = v_period.user_id and ce.period_start = v_period.period_start;

  select coalesce(sum(ca.amount), 0)::numeric(14,2) into v_adjustments
    from public.commission_adjustments ca where ca.period_id = v_period.id;

  -- Per-salesperson rate (falls back to global commission_tiers when unset).
  v_rate   := public.commission_rate_for(v_period.user_id, v_revenue);
  v_earned := round(v_revenue * v_rate / 100, 2);
  v_final  := v_earned + v_adjustments;

  update public.commission_periods
     set status = 'approved', revenue_ex_vat_snapshot = v_revenue,
         tier_rate_percent_snapshot = v_rate, earned_commission_snapshot = v_earned,
         adjustments_snapshot = v_adjustments, final_commission_snapshot = v_final,
         approved_at = now(), approved_by = (select auth.uid())
   where id = v_period.id;

  perform public.log_audit('commission_period.approve', 'commission_periods', v_period.id::text,
    v_period.user_id::text || ' ' || v_period.period_start::text,
    jsonb_build_object('status', v_period.status),
    jsonb_build_object('status','approved','revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate,
      'earned', v_earned, 'adjustments', v_adjustments, 'final', v_final),
    null, null, 'success');

  return json_build_object('period', v_period.id, 'status', 'approved',
    'revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate, 'earned_commission', v_earned,
    'adjustments', v_adjustments, 'final_commission', v_final);
end $$;


ALTER FUNCTION "public"."approve_commission_period"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_lead"("p_lead" "uuid", "p_staff" "uuid", "p_first_name" "text", "p_last_name" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_lead public.lead_inbox; v_customer uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can assign leads.';
  end if;
  if coalesce(btrim(p_first_name), '') = '' then
    raise exception 'First name is required.';
  end if;
  if not exists (
    select 1 from public.profiles p
    where p.user_id = p_staff
      and p.role in ('admin','staff')
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end)
  ) then
    raise exception 'Assignee must be an active admin or staff user.';
  end if;

  select * into v_lead from public.lead_inbox where id = p_lead for update;
  if not found then
    raise exception 'Lead not found.';
  end if;
  if v_lead.status <> 'new' then
    raise exception 'Lead is not assignable (current status: %).', v_lead.status;
  end if;

  insert into public.customers
    (first_name, last_name, email, phone, company_name, wishes, status, source, owner_user_id, created_by)
  values
    (btrim(p_first_name), coalesce(btrim(p_last_name), ''), v_lead.email, v_lead.phone,
     v_lead.company, v_lead.message, 'lead', coalesce(v_lead.source, 'lead'), p_staff, auth.uid())
  returning id into v_customer;

  update public.lead_inbox
    set status = 'assigned', assigned_to = p_staff, assigned_by = auth.uid(),
        assigned_at = now(), customer_id = v_customer, is_read = true
    where id = p_lead;

  perform public.log_audit(
    'lead.assigned', 'lead_inbox', p_lead::text, coalesce(v_lead.email, v_lead.name),
    null::jsonb,
    jsonb_build_object('customer_id', v_customer, 'assigned_to', p_staff, 'source', v_lead.source),
    null, null, 'success'
  );
  return v_customer;
end $$;


ALTER FUNCTION "public"."assign_lead"("p_lead" "uuid", "p_staff" "uuid", "p_first_name" "text", "p_last_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_domain_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('domain.create','domain', new.id::text, new.name,
      null,
      jsonb_build_object('customer_id', new.customer_id, 'status', new.status,
                         'registrar', new.registrar, 'auto_renew', new.auto_renew),
      null, null, 'success');
    return new;

  elsif tg_op = 'UPDATE' then
    if new.customer_id is distinct from old.customer_id then
      perform public.log_audit('domain.customer_changed','domain', old.id::text, old.name,
        jsonb_build_object('customer_id', old.customer_id),
        jsonb_build_object('customer_id', new.customer_id), null, null, 'success');
    end if;
    if new.status is distinct from old.status then
      perform public.log_audit('domain.status_changed','domain', old.id::text, old.name,
        jsonb_build_object('status', old.status),
        jsonb_build_object('status', new.status), null, null, 'success');
    end if;
    if new.auto_renew is distinct from old.auto_renew then
      perform public.log_audit('domain.autorenew_changed','domain', old.id::text, old.name,
        jsonb_build_object('auto_renew', old.auto_renew),
        jsonb_build_object('auto_renew', new.auto_renew), null, null, 'success');
    end if;
    if new.archived_at is distinct from old.archived_at and new.archived_at is not null then
      perform public.log_audit('domain.archived','domain', old.id::text, old.name,
        null, jsonb_build_object('customer_id', new.customer_id),
        null, null, 'success');
    end if;
    return new;

  elsif tg_op = 'DELETE' then
    perform public.log_audit('domain.deleted','domain', old.id::text, old.name,
      jsonb_build_object('customer_id', old.customer_id, 'status', old.status),
      null, null, null, 'success');
    return old;
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."audit_domain_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_domain_registrant_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare changed text[] := '{}';
begin
  if tg_op = 'DELETE' then
    perform public.log_audit('domain.registrant_changed','domain', old.domain_id::text, null,
      null, jsonb_build_object('op','delete'), null, null, 'success');
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if new.first_name    is distinct from old.first_name    then changed := changed || 'first_name'::text; end if;
    if new.last_name     is distinct from old.last_name     then changed := changed || 'last_name'::text; end if;
    if new.organization  is distinct from old.organization  then changed := changed || 'organization'::text; end if;
    if new.email         is distinct from old.email         then changed := changed || 'email'::text; end if;
    if new.phone         is distinct from old.phone         then changed := changed || 'phone'::text; end if;
    if new.address_line1 is distinct from old.address_line1 then changed := changed || 'address_line1'::text; end if;
    if new.address_line2 is distinct from old.address_line2 then changed := changed || 'address_line2'::text; end if;
    if new.city          is distinct from old.city          then changed := changed || 'city'::text; end if;
    if new.postal_code   is distinct from old.postal_code   then changed := changed || 'postal_code'::text; end if;
    if new.state         is distinct from old.state         then changed := changed || 'state'::text; end if;
    if new.country_code  is distinct from old.country_code  then changed := changed || 'country_code'::text; end if;
    if array_length(changed, 1) is null then return new; end if;
  else -- INSERT: record which fields were provided (names only)
    if new.first_name    is not null then changed := changed || 'first_name'::text; end if;
    if new.last_name     is not null then changed := changed || 'last_name'::text; end if;
    if new.organization  is not null then changed := changed || 'organization'::text; end if;
    if new.email         is not null then changed := changed || 'email'::text; end if;
    if new.phone         is not null then changed := changed || 'phone'::text; end if;
    if new.address_line1 is not null then changed := changed || 'address_line1'::text; end if;
    if new.address_line2 is not null then changed := changed || 'address_line2'::text; end if;
    if new.city          is not null then changed := changed || 'city'::text; end if;
    if new.postal_code   is not null then changed := changed || 'postal_code'::text; end if;
    if new.state         is not null then changed := changed || 'state'::text; end if;
    if new.country_code  is not null then changed := changed || 'country_code'::text; end if;
  end if;

  perform public.log_audit('domain.registrant_changed','domain', new.domain_id::text, null,
    null,
    jsonb_build_object('op', lower(tg_op), 'changed_fields', to_jsonb(changed)),
    null, null, 'success');
  return new;
end $$;


ALTER FUNCTION "public"."audit_domain_registrant_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin raise exception 'audit_log is append-only'; end $$;


ALTER FUNCTION "public"."audit_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_permission_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'INSERT' then
    perform public.log_audit('permission.grant','user_permissions', new.user_id::text, new.permission,
      null, jsonb_build_object('permission', new.permission), null, null, 'success');
  elsif tg_op = 'DELETE' then
    perform public.log_audit('permission.revoke','user_permissions', old.user_id::text, old.permission,
      jsonb_build_object('permission', old.permission), null, null, null, 'success');
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."audit_permission_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_profile_change"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.role is distinct from old.role
     or new.is_active is distinct from old.is_active
     or new.account_status is distinct from old.account_status
     or new.employment_start is distinct from old.employment_start
     or new.employment_end is distinct from old.employment_end
     or new.commission_eligible is distinct from old.commission_eligible then
    perform public.log_audit('profile.change','profiles', old.user_id::text,
      coalesce(old.email, old.user_id::text),
      jsonb_build_object('role',old.role,'is_active',old.is_active,'account_status',old.account_status,
        'employment_start',old.employment_start,'employment_end',old.employment_end,'commission_eligible',old.commission_eligible),
      jsonb_build_object('role',new.role,'is_active',new.is_active,'account_status',new.account_status,
        'employment_start',new.employment_start,'employment_end',new.employment_end,'commission_eligible',new.commission_eligible),
      null, null, 'success');
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."audit_profile_change"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."audit_profile_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  perform public.log_audit(
    'staff.invited', 'profiles', new.user_id::text,
    coalesce(new.email, new.user_id::text),
    null::jsonb,
    jsonb_build_object('role', new.role, 'account_status', new.account_status, 'is_active', new.is_active),
    null, null, 'success');
  return new;
end $$;


ALTER FUNCTION "public"."audit_profile_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_immutable"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  raise exception '% is append-only (% not allowed)', tg_table_name, tg_op;
end $$;


ALTER FUNCTION "public"."commission_immutable"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_next_tier_gap"("p_user_id" "uuid", "p_revenue" numeric) RETURNS numeric
    LANGUAGE "plpgsql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_next numeric(14,2);
  v_has  boolean;
begin
  if not (public.is_admin() or p_user_id = (select auth.uid())) then
    raise exception 'Not allowed.' using errcode = '42501';
  end if;

  select exists(select 1 from public.salesperson_commission_tiers t where t.user_id = p_user_id) into v_has;

  if v_has then
    select min(t.min_revenue_ex_vat) into v_next
      from public.salesperson_commission_tiers t
      where t.user_id = p_user_id and t.min_revenue_ex_vat > p_revenue;
  else
    select min(ct.min_revenue_ex_vat) into v_next
      from public.commission_tiers ct
      where ct.effective_to is null and ct.min_revenue_ex_vat > p_revenue;
  end if;

  if v_next is null then
    return null;              -- already at (or above) the top tier
  end if;
  return (v_next - p_revenue)::numeric(14,2);
end $$;


ALTER FUNCTION "public"."commission_next_tier_gap"("p_user_id" "uuid", "p_revenue" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."commission_rate_for"("p_user_id" "uuid", "p_revenue" numeric) RETURNS numeric
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select (case
    when exists (select 1 from public.salesperson_commission_tiers t where t.user_id = p_user_id)
    then coalesce((
      select t.rate_percent from public.salesperson_commission_tiers t
        where t.user_id = p_user_id and p_revenue >= t.min_revenue_ex_vat
        order by t.min_revenue_ex_vat desc limit 1), 0)
    else coalesce((
      select ct.rate_percent from public.commission_tiers ct
        where ct.effective_to is null and p_revenue >= ct.min_revenue_ex_vat
          and (ct.max_revenue_ex_vat is null or p_revenue < ct.max_revenue_ex_vat)
        order by ct.sort_order limit 1), 0)
  end)::numeric(5,2);
$$;


ALTER FUNCTION "public"."commission_rate_for"("p_user_id" "uuid", "p_revenue" numeric) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."confirm_invoice_paid"("p_invoice_id" "uuid", "p_salesperson_user_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_inv           public.invoices%rowtype;
  v_sales         uuid;
  v_eligible      boolean;
  v_period_start  date;
  v_period_end    date;
  v_period_id     uuid;
  v_entry_created boolean := false;
  v_reason        text := null;
  v_paid_at       timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can confirm an invoice as paid.' using errcode = '42501';
  end if;

  select * into v_inv from public.invoices where id = p_invoice_id for update;
  if not found then
    raise exception 'Invoice % not found.', p_invoice_id using errcode = 'P0002';
  end if;

  if v_inv.is_credit_note then
    raise exception 'Credit notes are settled at creation and cannot be confirmed as paid.'
      using errcode = 'P0001';
  end if;
  if v_inv.status = 'cancelled' then
    raise exception 'Cannot confirm a cancelled invoice as paid.' using errcode = 'P0001';
  end if;

  if v_inv.status = 'paid' then
    -- idempotent short-circuit: report existing state, no second write
    v_period_start := (date_trunc('month', (v_inv.paid_at at time zone 'Europe/Stockholm')))::date;
    select ce.user_id into v_sales from public.commission_entries ce where ce.invoice_id = v_inv.id;
    select cp.id into v_period_id from public.commission_periods cp
      where cp.period_start = v_period_start and cp.user_id = v_sales;
    return json_build_object(
      'invoice', v_inv.id, 'invoice_number', v_inv.invoice_number, 'status', v_inv.status,
      'period', v_period_id, 'commission_created', false,
      'eligible', (v_sales is not null), 'reason', 'already-paid');
  end if;

  v_sales := coalesce(p_salesperson_user_id, v_inv.salesperson_user_id);
  if v_sales is null then
    raise exception 'A salesperson must be assigned before confirming payment.' using errcode = 'P0001';
  end if;

  v_paid_at := now();
  update public.invoices
     set salesperson_user_id = v_sales, status = 'paid', paid_at = v_paid_at
   where id = v_inv.id;

  select p.commission_eligible into v_eligible from public.profiles p where p.user_id = v_sales;
  v_eligible := coalesce(v_eligible, false);

  if not v_eligible then
    v_reason := 'salesperson-not-commission-eligible';
    perform public.log_audit('invoice.confirm_paid', 'invoices', v_inv.id::text,
      v_inv.invoice_number::text, jsonb_build_object('status', v_inv.status),
      jsonb_build_object('status','paid','paid_at', v_paid_at, 'salesperson_user_id', v_sales,
        'commission_created', false, 'eligible', false, 'reason', v_reason),
      null, null, 'success');
    return json_build_object('invoice', v_inv.id, 'invoice_number', v_inv.invoice_number,
      'status', 'paid', 'period', null, 'commission_created', false,
      'eligible', false, 'reason', v_reason);
  end if;

  v_period_start := (date_trunc('month', (v_paid_at at time zone 'Europe/Stockholm')))::date;
  v_period_end   := (date_trunc('month', v_period_start) + interval '1 month - 1 day')::date;

  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (v_sales, v_period_start, v_period_end, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select cp.id into v_period_id from public.commission_periods cp
    where cp.user_id = v_sales and cp.period_start = v_period_start;

  with ins as (
    insert into public.commission_entries
      (invoice_id, user_id, period_start, paid_at_snapshot, amount_ex_vat_snapshot,
       vat_amount_snapshot, total_snapshot, invoice_number_snapshot, customer_id, created_by)
    values (v_inv.id, v_sales, v_period_start, v_paid_at, v_inv.amount::numeric(14,2),
       v_inv.vat_amount::numeric(14,2), v_inv.total::numeric(14,2), v_inv.invoice_number,
       v_inv.customer_id, (select auth.uid()))
    on conflict (invoice_id) do nothing
    returning id)
  select exists (select 1 from ins) into v_entry_created;
  v_reason := case when v_entry_created then null else 'entry-already-exists' end;

  perform public.log_audit('invoice.confirm_paid', 'invoices', v_inv.id::text,
    v_inv.invoice_number::text, jsonb_build_object('status', v_inv.status),
    jsonb_build_object('status','paid','paid_at', v_paid_at, 'salesperson_user_id', v_sales,
      'period_start', v_period_start, 'commission_created', v_entry_created, 'eligible', true),
    null, null, 'success');

  return json_build_object('invoice', v_inv.id, 'invoice_number', v_inv.invoice_number,
    'status', 'paid', 'period', v_period_id, 'commission_created', v_entry_created,
    'eligible', true, 'reason', v_reason);
end $$;


ALTER FUNCTION "public"."confirm_invoice_paid"("p_invoice_id" "uuid", "p_salesperson_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_commission_adjustment"("p_user_id" "uuid", "p_period_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_adjustment_type" "text", "p_source_invoice_id" "uuid" DEFAULT NULL::"uuid", "p_source_credit_invoice_id" "uuid" DEFAULT NULL::"uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_period public.commission_periods%rowtype; v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create a commission adjustment.' using errcode = '42501';
  end if;
  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A non-empty reason is required for an adjustment.' using errcode = 'P0001';
  end if;
  if p_adjustment_type is null or p_adjustment_type not in ('refund','credit','correction','bonus','other') then
    raise exception 'Invalid adjustment_type: %', p_adjustment_type using errcode = 'P0001';
  end if;
  if p_amount is null then
    raise exception 'Adjustment amount is required.' using errcode = 'P0001';
  end if;

  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.user_id <> p_user_id then
    raise exception 'Period % does not belong to user %.', p_period_id, p_user_id using errcode = 'P0001';
  end if;
  -- adjustments are only permitted on OPEN periods; approved/paid are locked.
  -- Corrections to a locked month are posted to the current open period instead.
  if v_period.status <> 'open' then
    raise exception 'Cannot adjust a % period; post the correction to the current open period.', v_period.status
      using errcode = 'P0001';
  end if;

  insert into public.commission_adjustments
    (user_id, period_id, amount, reason, adjustment_type, source_invoice_id, source_credit_invoice_id, created_by)
  values (p_user_id, p_period_id, p_amount::numeric(14,2), btrim(p_reason), p_adjustment_type,
     p_source_invoice_id, p_source_credit_invoice_id, (select auth.uid()))
  returning id into v_id;

  perform public.log_audit('commission_adjustment.create', 'commission_adjustments', v_id::text,
    p_user_id::text || ' ' || v_period.period_start::text, null,
    jsonb_build_object('amount', p_amount, 'reason', btrim(p_reason), 'adjustment_type', p_adjustment_type,
      'period_id', p_period_id, 'source_invoice_id', p_source_invoice_id,
      'source_credit_invoice_id', p_source_credit_invoice_id),
    null, null, 'success');

  return json_build_object('adjustment', v_id, 'period', p_period_id, 'user_id', p_user_id,
    'amount', p_amount::numeric(14,2));
end $$;


ALTER FUNCTION "public"."create_commission_adjustment"("p_user_id" "uuid", "p_period_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_adjustment_type" "text", "p_source_invoice_id" "uuid", "p_source_credit_invoice_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text" DEFAULT 'pending'::"text", "p_registered_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_expires_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_auto_renew" boolean DEFAULT false, "p_locked" boolean DEFAULT false, "p_nameservers" "text"[] DEFAULT '{}'::"text"[], "p_registrant" "jsonb" DEFAULT NULL::"jsonb") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_domain_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can create a domain.';
  end if;

  if p_name is null or p_name = '' or p_name <> lower(p_name) then
    raise exception 'Domain name must be normalized (lowercase) before creation.';
  end if;

  if not exists (select 1 from public.customers c
                 where c.id = p_customer_id and c.archived_at is null) then
    raise exception 'Customer not found.';
  end if;

  insert into public.domains(
      customer_id, name, status, registrar,
      registered_at, expires_at, auto_renew, locked, nameservers, created_by)
  values (
      p_customer_id, p_name, coalesce(p_status,'pending'), 'manual',
      p_registered_at, p_expires_at, coalesce(p_auto_renew,false),
      coalesce(p_locked,false), coalesce(p_nameservers,'{}'::text[]), (select auth.uid()))
  returning id into v_domain_id;

  if p_registrant is not null then
    insert into public.domain_registrants(
        domain_id, first_name, last_name, organization, email, phone,
        address_line1, address_line2, city, postal_code, state, country_code)
    values (
        v_domain_id,
        p_registrant->>'first_name', p_registrant->>'last_name', p_registrant->>'organization',
        p_registrant->>'email', p_registrant->>'phone',
        p_registrant->>'address_line1', p_registrant->>'address_line2',
        p_registrant->>'city', p_registrant->>'postal_code', p_registrant->>'state',
        p_registrant->>'country_code');
  end if;

  return v_domain_id;
end $$;


ALTER FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text", "p_registered_at" timestamp with time zone, "p_expires_at" timestamp with time zone, "p_auto_renew" boolean, "p_locked" boolean, "p_nameservers" "text"[], "p_registrant" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."current_open_commission_period"("p_user_id" "uuid") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_ps date; v_pe date; v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can resolve the current open period.' using errcode = '42501';
  end if;
  v_ps := (date_trunc('month', (now() at time zone 'Europe/Stockholm')))::date;
  v_pe := (date_trunc('month', v_ps) + interval '1 month - 1 day')::date;
  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (p_user_id, v_ps, v_pe, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select id into v_id from public.commission_periods where user_id = p_user_id and period_start = v_ps;
  return v_id;
end $$;


ALTER FUNCTION "public"."current_open_commission_period"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_commission_period_figures"("p_period_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" STABLE
    SET "search_path" TO ''
    AS $$
declare
  v_period  public.commission_periods%rowtype;
  v_revenue numeric(14,2);
  v_rate    numeric(5,2);
  v_earned  numeric(14,2);
  v_adj     numeric(14,2);
  v_final   numeric(14,2);
begin
  select * into v_period from public.commission_periods where id = p_period_id;
  if not found then
    return null;   -- RLS-hidden or nonexistent
  end if;

  if v_period.status <> 'open' then
    return json_build_object('period', v_period.id, 'user_id', v_period.user_id,
      'period_start', v_period.period_start, 'status', v_period.status, 'dynamic', false,
      'revenue_ex_vat', v_period.revenue_ex_vat_snapshot, 'tier_rate_percent', v_period.tier_rate_percent_snapshot,
      'earned_commission', v_period.earned_commission_snapshot, 'adjustments', v_period.adjustments_snapshot,
      'final_commission', v_period.final_commission_snapshot);
  end if;

  select coalesce(sum(ce.amount_ex_vat_snapshot), 0)::numeric(14,2) into v_revenue
    from public.commission_entries ce
    where ce.user_id = v_period.user_id and ce.period_start = v_period.period_start;
  select coalesce(sum(ca.amount), 0)::numeric(14,2) into v_adj
    from public.commission_adjustments ca where ca.period_id = v_period.id;

  v_rate   := public.commission_rate_for(v_period.user_id, v_revenue);
  v_earned := round(v_revenue * v_rate / 100, 2);
  v_final  := v_earned + v_adj;

  return json_build_object('period', v_period.id, 'user_id', v_period.user_id,
    'period_start', v_period.period_start, 'status', v_period.status, 'dynamic', true,
    'revenue_ex_vat', v_revenue, 'tier_rate_percent', v_rate, 'earned_commission', v_earned,
    'adjustments', v_adj, 'final_commission', v_final);
end $$;


ALTER FUNCTION "public"."get_commission_period_figures"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."has_permission"("perm" "text") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select public.is_admin()
      or (public.is_active_user() and exists (select 1 from public.user_permissions up
            where up.user_id = (select auth.uid()) and up.permission = perm));
$$;


ALTER FUNCTION "public"."has_permission"("perm" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_profile"("p_is_active" boolean, "p_account_status" "text", "p_start" "date", "p_end" "date") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  select p_is_active
     and p_account_status = 'active'
     and (p_start is null or p_start <= (now() at time zone 'Europe/Stockholm')::date)
     and (p_end   is null or p_end   >= (now() at time zone 'Europe/Stockholm')::date);
$$;


ALTER FUNCTION "public"."is_active_profile"("p_is_active" boolean, "p_account_status" "text", "p_start" "date", "p_end" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_active_user"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.profiles p
    where p.user_id = (select auth.uid())
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
$$;


ALTER FUNCTION "public"."is_active_user"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_admin"() RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (select 1 from public.profiles p
    where p.user_id = (select auth.uid()) and p.role = 'admin'
      and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end));
$$;


ALTER FUNCTION "public"."is_admin"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") RETURNS boolean
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  select exists (
    select 1 from public.customers c
    where c.id = p_customer_id
      and c.portal_user_id = (select auth.uid())
      and c.archived_at is null
  );
$$;


ALTER FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.audit_log(actor_user_id, actor_email, actor_role, action, target_type,
    target_id, target_label, before, after, ip, user_agent, outcome)
  values ((select auth.uid()),
    (select email from auth.users where id = (select auth.uid())),
    (select role  from public.profiles where user_id = (select auth.uid())),
    p_action, p_target_type, p_target_id, p_target_label,
    public.redact(p_before), public.redact(p_after), p_ip, p_user_agent, coalesce(p_outcome,'success'));
end $$;


ALTER FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text" DEFAULT NULL::"text", "p_user_agent" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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


ALTER FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text", "p_user_agent" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  insert into public.audit_log(actor_user_id, actor_email, actor_role, action, target_type,
    target_id, target_label, before, after, ip, user_agent, outcome)
  values (p_actor_user_id,
    (select email from auth.users where id = p_actor_user_id),
    (select role  from public.profiles where user_id = p_actor_user_id),
    p_action, p_target_type, p_target_id, p_target_label,
    public.redact(p_before), public.redact(p_after), p_ip, p_user_agent, coalesce(p_outcome,'blocked'));
end $$;


ALTER FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."mark_commission_period_paid"("p_period_id" "uuid") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_period public.commission_periods%rowtype; v_paid_at timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can mark a commission period paid.' using errcode = '42501';
  end if;
  select * into v_period from public.commission_periods where id = p_period_id for update;
  if not found then
    raise exception 'Commission period % not found.', p_period_id using errcode = 'P0002';
  end if;
  if v_period.status <> 'approved' then
    raise exception 'Period must be approved before it can be paid (current: %).', v_period.status
      using errcode = 'P0001';
  end if;

  v_paid_at := now();
  update public.commission_periods
     set status = 'paid', paid_at = v_paid_at, paid_by = (select auth.uid())
   where id = v_period.id;

  perform public.log_audit('commission_period.mark_paid', 'commission_periods', v_period.id::text,
    v_period.user_id::text || ' ' || v_period.period_start::text,
    jsonb_build_object('status', v_period.status),
    jsonb_build_object('status','paid','paid_at', v_paid_at, 'final_commission', v_period.final_commission_snapshot),
    null, null, 'success');

  return json_build_object('period', v_period.id, 'status', 'paid', 'paid_at', v_paid_at,
    'final_commission', v_period.final_commission_snapshot);
end $$;


ALTER FUNCTION "public"."mark_commission_period_paid"("p_period_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_commission_period"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  -- identity is never mutable
  if new.user_id is distinct from old.user_id
     or new.period_start is distinct from old.period_start
     or new.period_end is distinct from old.period_end
     or new.created_at is distinct from old.created_at then
    raise exception 'commission_periods identity (user/period/created_at) is immutable.';
  end if;
  -- allowed status transitions only
  if new.status is distinct from old.status then
    if not ( (old.status = 'open'     and new.status = 'approved')
          or (old.status = 'approved' and new.status = 'paid') ) then
      raise exception 'Illegal commission period transition % -> % (allowed: open->approved->paid).',
        old.status, new.status;
    end if;
  end if;
  -- once left 'open', financial snapshots freeze
  if old.status <> 'open' then
    if new.revenue_ex_vat_snapshot     is distinct from old.revenue_ex_vat_snapshot
       or new.tier_rate_percent_snapshot is distinct from old.tier_rate_percent_snapshot
       or new.earned_commission_snapshot is distinct from old.earned_commission_snapshot
       or new.adjustments_snapshot       is distinct from old.adjustments_snapshot
       or new.final_commission_snapshot  is distinct from old.final_commission_snapshot then
      raise exception 'Commission snapshots are frozen once the period is % (no recompute).', old.status;
    end if;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."protect_commission_period"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_customer_columns"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_admin() and (
       new.owner_user_id  is distinct from old.owner_user_id
    or new.created_by     is distinct from old.created_by
    or new.archived_at    is distinct from old.archived_at
    or new.portal_user_id is distinct from old.portal_user_id) then
    raise exception 'Only an admin can change ownership, archive state, or the portal link.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."protect_customer_columns"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_invoice_salesperson"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_admin()
     and new.salesperson_user_id is distinct from old.salesperson_user_id then
    raise exception 'Only an admin can change salesperson attribution.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."protect_invoice_salesperson"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_profiles"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare other_active_admins int;
begin
  if tg_op = 'UPDATE' then
    -- a user may never change their own role
    if (select auth.uid()) is not null and (select auth.uid()) = old.user_id
       and new.role is distinct from old.role then
      raise exception 'You cannot change your own role.';
    end if;
    -- last-active-admin protection: covers demote (role='staff'), suspend
    -- (account_status='suspended'), end (account_status='ended'),
    -- deactivate (is_active=false) and employment-window expiry, because each
    -- of those makes is_active_profile(new.*) false for an admin row.
    if old.role = 'admin'
       and public.is_active_profile(old.is_active, old.account_status, old.employment_start, old.employment_end)
       and not (new.role = 'admin'
         and public.is_active_profile(new.is_active, new.account_status, new.employment_start, new.employment_end))
    then
      select count(*) into other_active_admins from public.profiles
        where role = 'admin' and user_id <> old.user_id
          and public.is_active_profile(is_active, account_status, employment_start, employment_end);
      if other_active_admins = 0 then
        raise exception 'Cannot remove the last active admin (demote/suspend/deactivate/end/expire).';
      end if;
    end if;
    return new;
  elsif tg_op = 'DELETE' then
    if old.role = 'admin'
       and public.is_active_profile(old.is_active, old.account_status, old.employment_start, old.employment_end) then
      select count(*) into other_active_admins from public.profiles
        where role = 'admin' and user_id <> old.user_id
          and public.is_active_profile(is_active, account_status, employment_start, employment_end);
      if other_active_admins = 0 then
        raise exception 'Cannot delete the last active admin.';
      end if;
    end if;
    return old;
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."protect_profiles"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_quote_fields"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if public.is_admin() then return new; end if;
  if coalesce(current_setting('app.allow_quote_totals', true), '') = '1' then
    return new; -- internal totals recalc path
  end if;
  if old.status <> 'draft' then
    raise exception 'Staff can only edit draft quotes.';
  end if;
  -- customer reassignment must stay within own active customers
  if new.customer_id is distinct from old.customer_id then
    if new.customer_id is null
       or not exists (select 1 from public.customers c
         where c.id = new.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null) then
      raise exception 'Staff can only move a quote to their own active customer.';
    end if;
  end if;
  -- everything NOT in the whitelist must be unchanged
  if new.id is distinct from old.id
     or new.created_at is distinct from old.created_at
     or new.quote_number is distinct from old.quote_number
     or new.status is distinct from old.status
     or new.subtotal is distinct from old.subtotal
     or new.vat_rate is distinct from old.vat_rate
     or new.vat_amount is distinct from old.vat_amount
     or new.total is distinct from old.total
     or new.sent_at is distinct from old.sent_at
     or new.sent_to_email is distinct from old.sent_to_email
     or new.public_token is distinct from old.public_token
     or new.customer_response_at is distinct from old.customer_response_at
     or new.customer_response_note is distinct from old.customer_response_note
     or new.owner_user_id is distinct from old.owner_user_id
     or new.created_by is distinct from old.created_by
     or new.archived_at is distinct from old.archived_at then
    raise exception 'Staff may only edit customer/title/description/valid dates/notes/terms on a draft quote.';
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."protect_quote_fields"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."protect_quote_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if not public.is_admin() then
    if new.owner_user_id is distinct from (select auth.uid())
       or new.created_by is distinct from (select auth.uid()) then
      raise exception 'Staff must create quotes owned by and created_by themselves.';
    end if;
    if new.customer_id is null
       or not exists (select 1 from public.customers c
         where c.id = new.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null) then
      raise exception 'Staff can only create quotes for their own active customers.';
    end if;
    new.status := 'draft';
    new.subtotal := 0; new.vat_amount := 0; new.total := 0;
    new.sent_at := null; new.sent_to_email := null; new.public_token := null;
    new.customer_response_at := null; new.customer_response_note := null; new.archived_at := null;
  end if;
  return new;
end $$;


ALTER FUNCTION "public"."protect_quote_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quote_item_total"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
begin
  new.total := round(coalesce(new.quantity, 0) * coalesce(new.unit_price, 0), 2);
  return new;
end $$;


ALTER FUNCTION "public"."quote_item_total"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quote_items_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if tg_op = 'UPDATE' and new.quote_id is distinct from old.quote_id then
    perform public.recalc_quote_totals(old.quote_id);
    perform public.recalc_quote_totals(new.quote_id);
  elsif tg_op = 'DELETE' then
    perform public.recalc_quote_totals(old.quote_id);
  else
    perform public.recalc_quote_totals(new.quote_id);
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."quote_items_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."quotes_vat_recalc"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
begin
  if new.vat_rate is distinct from old.vat_rate then
    perform public.recalc_quote_totals(new.id);
  end if;
  return null;
end $$;


ALTER FUNCTION "public"."quotes_vat_recalc"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."recalc_quote_totals"("p_quote" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare v_sub numeric(12,2); v_rate numeric(5,2); v_vat numeric(12,2);
begin
  if p_quote is null then return; end if;
  select coalesce(sum(total), 0) into v_sub
    from public.quote_items where quote_id = p_quote and archived_at is null;
  select vat_rate into v_rate from public.quotes where id = p_quote;
  v_vat := round(v_sub * coalesce(v_rate, 0) / 100, 2);
  perform set_config('app.allow_quote_totals', '1', true);
  update public.quotes set subtotal = v_sub, vat_amount = v_vat, total = v_sub + v_vat
    where id = p_quote;
  perform set_config('app.allow_quote_totals', '', true);
end $$;


ALTER FUNCTION "public"."recalc_quote_totals"("p_quote" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_call_outcome"("p_session_id" "uuid", "p_customer_id" "uuid", "p_active_call_id" "uuid", "p_outcome" "text", "p_request_id" "uuid", "p_note" "text" DEFAULT NULL::"text", "p_reminder_date" "text" DEFAULT NULL::"text", "p_reminder_time" "text" DEFAULT NULL::"text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $_$
DECLARE
  v_agent          uuid := (SELECT auth.uid());
  v_session        call_sessions%ROWTYPE;
  v_customer       customers%ROWTYPE;
  v_existing_id    uuid;
  v_interaction_id uuid;
  v_reminder_id    uuid;
  v_desc           text;
  v_new_status     text;
  v_rdate          date;
  v_rtime          text;
  v_tomorrow       date;
BEGIN
  IF v_agent IS NULL THEN
    RAISE EXCEPTION 'unauthorized' USING ERRCODE = 'PT401';
  END IF;

  IF p_request_id IS NULL THEN
    RAISE EXCEPTION 'missing_request_id' USING ERRCODE = 'PT400';
  END IF;

  IF p_outcome NOT IN ('interested', 'call_back', 'no_answer', 'not_interested') THEN
    RAISE EXCEPTION 'invalid_outcome' USING ERRCODE = 'PT400';
  END IF;

  -- Reminder date/time rules per outcome (defense-in-depth; API validates too).
  IF p_outcome = 'call_back' AND (p_reminder_date IS NULL OR p_reminder_time IS NULL) THEN
    RAISE EXCEPTION 'missing_callback_datetime' USING ERRCODE = 'PT400';
  END IF;
  IF p_outcome IN ('no_answer', 'not_interested')
     AND (p_reminder_date IS NOT NULL OR p_reminder_time IS NOT NULL) THEN
    RAISE EXCEPTION 'reminder_not_allowed' USING ERRCODE = 'PT400';
  END IF;
  IF p_outcome = 'interested'
     AND ((p_reminder_date IS NULL) <> (p_reminder_time IS NULL)) THEN
    RAISE EXCEPTION 'incomplete_reminder' USING ERRCODE = 'PT400';
  END IF;
  IF p_reminder_date IS NOT NULL AND p_reminder_date !~ '^\d{8}$' THEN
    RAISE EXCEPTION 'invalid_reminder_date' USING ERRCODE = 'PT400';
  END IF;
  IF p_reminder_time IS NOT NULL AND p_reminder_time !~ '^\d{4}$' THEN
    RAISE EXCEPTION 'invalid_reminder_time' USING ERRCODE = 'PT400';
  END IF;

  -- Idempotency: an outcome already recorded for this (agent, request_id)?
  SELECT id INTO v_existing_id
  FROM customer_interactions
  WHERE created_by = v_agent AND request_id = p_request_id
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object('status', 'duplicate', 'interaction_id', v_existing_id, 'idempotent', true);
  END IF;

  -- Load + lock session; verify ownership and wrong-customer guard.
  SELECT * INTO v_session FROM call_sessions WHERE id = p_session_id FOR UPDATE;
  IF NOT FOUND OR v_session.agent_id <> v_agent THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'PT409';
  END IF;

  IF v_session.active_call_id IS DISTINCT FROM p_active_call_id
     OR v_session.active_customer_id IS DISTINCT FROM p_customer_id THEN
    RAISE EXCEPTION 'stale_session' USING ERRCODE = 'PT409';
  END IF;

  -- Load + lock customer.
  SELECT * INTO v_customer FROM customers WHERE id = p_customer_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'customer_not_found' USING ERRCODE = 'PT409';
  END IF;

  -- Human-readable log line; Add Note is merged into this same interaction.
  v_desc := CASE p_outcome
    WHEN 'interested'     THEN 'Samtal: Intresserad'
    WHEN 'call_back'      THEN 'Samtal: Ring tillbaka'
    WHEN 'no_answer'      THEN 'Samtal: Inget svar'
    WHEN 'not_interested' THEN 'Samtal: Ej intresserad'
  END;
  IF p_note IS NOT NULL AND length(btrim(p_note)) > 0 THEN
    v_desc := v_desc || E'\n' || btrim(p_note);
  END IF;

  -- Single call interaction (idempotency enforced by the unique index too).
  BEGIN
    INSERT INTO customer_interactions (customer_id, type, description, call_outcome, request_id, created_by)
    VALUES (p_customer_id, 'call', v_desc, p_outcome, p_request_id, v_agent)
    RETURNING id INTO v_interaction_id;
  EXCEPTION WHEN unique_violation THEN
    SELECT id INTO v_existing_id
    FROM customer_interactions
    WHERE created_by = v_agent AND request_id = p_request_id
    LIMIT 1;
    RETURN jsonb_build_object('status', 'duplicate', 'interaction_id', v_existing_id, 'idempotent', true);
  END;

  -- Status mapping (guarded; never downgrades a customer).
  v_new_status := v_customer.status;
  IF p_outcome = 'interested' AND v_customer.status IN ('lead', 'contacted') THEN
    v_new_status := 'contacted';
  ELSIF p_outcome = 'not_interested' AND v_customer.status <> 'customer' THEN
    v_new_status := 'churned';
  END IF;

  UPDATE customers
  SET last_call_at = now(),
      last_call_result = p_outcome,
      status = v_new_status
  WHERE id = p_customer_id;

  -- Reminders -------------------------------------------------------------
  IF p_outcome = 'call_back' THEN
    -- User-chosen date/time.
    v_rdate := to_date(p_reminder_date, 'YYYYMMDD');
    v_rtime := left(p_reminder_time, 2) || ':' || right(p_reminder_time, 2);
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    VALUES (
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_rdate, v_rtime, 'follow_up', v_agent
    )
    RETURNING id INTO v_reminder_id;

  ELSIF p_outcome = 'no_answer' THEN
    -- Auto: next day 09:00 Europe/Stockholm, de-duplicated.
    v_tomorrow := (now() AT TIME ZONE 'Europe/Stockholm')::date + 1;
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    SELECT
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_tomorrow, '09:00', 'follow_up', v_agent
    WHERE NOT EXISTS (
      SELECT 1 FROM reminders
      WHERE customer_id = p_customer_id
        AND is_completed = false
        AND reminder_date = v_tomorrow
        AND type = 'follow_up'
    )
    RETURNING id INTO v_reminder_id;

  ELSIF p_outcome = 'interested' AND p_reminder_date IS NOT NULL THEN
    -- Optional reminder.
    v_rdate := to_date(p_reminder_date, 'YYYYMMDD');
    v_rtime := left(p_reminder_time, 2) || ':' || right(p_reminder_time, 2);
    INSERT INTO reminders (customer_id, title, reminder_date, reminder_time, type, created_by)
    VALUES (
      p_customer_id,
      'Ring upp ' || COALESCE(NULLIF(btrim(v_customer.first_name), ''), 'kund'),
      v_rdate, v_rtime, 'follow_up', v_agent
    )
    RETURNING id INTO v_reminder_id;
  END IF;

  UPDATE call_sessions SET state = 'wrap_up', updated_at = now() WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'status', 'ok',
    'interaction_id', v_interaction_id,
    'reminder_id', v_reminder_id,
    'new_status', v_new_status
  );
END;
$_$;


ALTER FUNCTION "public"."record_call_outcome"("p_session_id" "uuid", "p_customer_id" "uuid", "p_active_call_id" "uuid", "p_outcome" "text", "p_request_id" "uuid", "p_note" "text", "p_reminder_date" "text", "p_reminder_time" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."record_commission_payment"("p_salesperson_user_id" "uuid", "p_customer_id" "uuid", "p_amount_ex_vat" numeric, "p_paid_date" "date", "p_note" "text" DEFAULT NULL::"text") RETURNS json
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_eligible     boolean;
  v_period_start date;
  v_period_end   date;
  v_period_id    uuid;
  v_status       text;
  v_entry_id     uuid;
begin
  if not public.is_admin() then
    raise exception 'Only an admin can record a commission payment.' using errcode = '42501';
  end if;
  if p_amount_ex_vat is null or p_amount_ex_vat <= 0 then
    raise exception 'Amount (ex VAT) must be a positive number.' using errcode = 'P0001';
  end if;
  if p_paid_date is null then
    raise exception 'Paid date is required.' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.customers c where c.id = p_customer_id) then
    raise exception 'Customer % not found.', p_customer_id using errcode = 'P0002';
  end if;

  -- salesperson must be commission-eligible (roles/eligibility live in profiles)
  select p.commission_eligible into v_eligible from public.profiles p where p.user_id = p_salesperson_user_id;
  if not coalesce(v_eligible, false) then
    raise exception 'Salesperson is not commission-eligible.' using errcode = 'P0001';
  end if;

  v_period_start := date_trunc('month', p_paid_date)::date;
  v_period_end   := (date_trunc('month', p_paid_date) + interval '1 month - 1 day')::date;

  insert into public.commission_periods (user_id, period_start, period_end, status, created_by)
  values (p_salesperson_user_id, v_period_start, v_period_end, 'open', (select auth.uid()))
  on conflict (user_id, period_start) do nothing;
  select id, status into v_period_id, v_status from public.commission_periods
    where user_id = p_salesperson_user_id and period_start = v_period_start;

  -- never add to a locked month (approved/paid) — post a correction to the open month instead
  if v_status <> 'open' then
    raise exception 'Cannot add a payment to a % period (it is locked).', v_status using errcode = 'P0001';
  end if;

  insert into public.commission_entries
    (invoice_id, user_id, period_start, paid_at_snapshot, amount_ex_vat_snapshot,
     vat_amount_snapshot, total_snapshot, invoice_number_snapshot, customer_id, note, created_by)
  values
    (null, p_salesperson_user_id, v_period_start, p_paid_date::timestamptz,
     p_amount_ex_vat::numeric(14,2), 0, p_amount_ex_vat::numeric(14,2), null,
     p_customer_id, p_note, (select auth.uid()))
  returning id into v_entry_id;

  perform public.log_audit('commission.record_payment', 'commission_entries', v_entry_id::text,
    p_salesperson_user_id::text || ' ' || v_period_start::text, null,
    jsonb_build_object('amount_ex_vat', p_amount_ex_vat, 'customer_id', p_customer_id,
      'paid_date', p_paid_date, 'note', p_note, 'invoice_id', null),
    null, null, 'success');

  return json_build_object('entry', v_entry_id, 'period', v_period_id, 'period_start', v_period_start,
    'user_id', p_salesperson_user_id, 'amount_ex_vat', p_amount_ex_vat::numeric(14,2));
end $$;


ALTER FUNCTION "public"."record_commission_payment"("p_salesperson_user_id" "uuid", "p_customer_id" "uuid", "p_amount_ex_vat" numeric, "p_paid_date" "date", "p_note" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."redact"("p" "jsonb") RETURNS "jsonb"
    LANGUAGE "plpgsql" IMMUTABLE
    SET "search_path" TO ''
    AS $$
declare k text; v jsonb; out jsonb;
begin
  if p is null then return null; end if;
  if jsonb_typeof(p) = 'object' then
    out := '{}'::jsonb;
    for k, v in select key, value from jsonb_each(p) loop
      if lower(k) in ('personnummer','personal_identity_number','ssn','bank_account',
          'bank_account_number','bank_account_ct','personnummer_ct','password',
          'token','public_token','access_token','refresh_token') then
        out := out || jsonb_build_object(k, to_jsonb('***'::text));
      else
        out := out || jsonb_build_object(k, public.redact(v));
      end if;
    end loop;
    return out;
  elsif jsonb_typeof(p) = 'array' then
    select coalesce(jsonb_agg(public.redact(e)), '[]'::jsonb) into out
      from jsonb_array_elements(p) e;
    return out;
  else
    return p;
  end if;
end $$;


ALTER FUNCTION "public"."redact"("p" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."set_user_permissions"("p_user" "uuid", "p_perms" "text"[]) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
declare
  v_perm text;
  v_bad  text;
begin
  if not public.is_admin() then
    raise exception 'Only an active admin may set user permissions.'
      using errcode = 'insufficient_privilege';
  end if;

  -- allowlist check: reject any permission not in the canonical set
  select p into v_bad
  from unnest(coalesce(p_perms, array[]::text[])) as p
  where p not in (
    'crm.access','customers.view_own','customers.create','customers.update_own',
    'quotes.view_own','quotes.create','quotes.update_own',
    'emails.send','reminders.manage_own','attachments.upload')
  limit 1;
  if v_bad is not null then
    raise exception 'Invalid permission: %', v_bad;
  end if;

  -- atomic replace of the full permission set for p_user
  delete from public.user_permissions where user_id = p_user;
  foreach v_perm in array coalesce(p_perms, array[]::text[]) loop
    insert into public.user_permissions(user_id, permission, granted_by)
      values (p_user, v_perm, (select auth.uid()))
      on conflict (user_id, permission) do nothing;
  end loop;
end $$;


ALTER FUNCTION "public"."set_user_permissions"("p_user" "uuid", "p_perms" "text"[]) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_email_on_preferences_insert"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_email_on_preferences_insert"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."sync_user_email_to_preferences"() RETURNS "trigger"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
BEGIN
  UPDATE user_preferences
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."sync_user_email_to_preferences"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    SET "search_path" TO ''
    AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."attachments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "entity_type" "text" NOT NULL,
    "entity_id" "uuid" NOT NULL,
    "kind" "text" NOT NULL,
    "name" "text" NOT NULL,
    "file_name" "text" NOT NULL,
    "mime_type" "text" NOT NULL,
    "file_ext" "text",
    "file_size" integer DEFAULT 0 NOT NULL,
    "storage_path" "text" NOT NULL,
    "width" integer,
    "height" integer,
    CONSTRAINT "attachments_kind_check" CHECK (("kind" = ANY (ARRAY['image'::"text", 'document'::"text"])))
);


ALTER TABLE "public"."attachments" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."audit_log" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "actor_user_id" "uuid",
    "actor_email" "text",
    "actor_role" "text",
    "action" "text" NOT NULL,
    "target_type" "text",
    "target_id" "text",
    "target_label" "text",
    "before" "jsonb",
    "after" "jsonb",
    "ip" "text",
    "user_agent" "text",
    "outcome" "text" DEFAULT 'success'::"text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "audit_log_outcome_check" CHECK (("outcome" = ANY (ARRAY['success'::"text", 'blocked'::"text", 'error'::"text"])))
);


ALTER TABLE "public"."audit_log" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."call_sessions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "agent_id" "uuid" NOT NULL,
    "active_customer_id" "uuid",
    "active_call_id" "uuid",
    "state" "text" DEFAULT 'idle'::"text" NOT NULL,
    "lead_order" "uuid"[] DEFAULT '{}'::"uuid"[] NOT NULL,
    "lead_index" integer DEFAULT '-1'::integer NOT NULL,
    "mobile_last_seen_at" timestamp with time zone,
    "version" integer DEFAULT 0 NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "call_sessions_state_check" CHECK (("state" = ANY (ARRAY['idle'::"text", 'dialing'::"text", 'wrap_up'::"text", 'ended'::"text"])))
);

ALTER TABLE ONLY "public"."call_sessions" REPLICA IDENTITY FULL;


ALTER TABLE "public"."call_sessions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."code_snippets" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "title" "text" NOT NULL,
    "description" "text",
    "code" "text" NOT NULL,
    "language" "text",
    "tags" "text"[] DEFAULT '{}'::"text"[],
    "is_favorite" boolean DEFAULT false,
    "created_by" "uuid"
);


ALTER TABLE "public"."code_snippets" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."commission_adjustments" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_id" "uuid" NOT NULL,
    "amount" numeric(14,2) NOT NULL,
    "reason" "text" NOT NULL,
    "adjustment_type" "text" NOT NULL,
    "source_invoice_id" "uuid",
    "source_credit_invoice_id" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "commission_adjustments_adjustment_type_check" CHECK (("adjustment_type" = ANY (ARRAY['refund'::"text", 'credit'::"text", 'correction'::"text", 'bonus'::"text", 'other'::"text"]))),
    CONSTRAINT "commission_adjustments_reason_nonempty" CHECK (("length"("btrim"("reason")) > 0))
);


ALTER TABLE "public"."commission_adjustments" OWNER TO "postgres";


COMMENT ON TABLE "public"."commission_adjustments" IS 'Append-only signed commission adjustments (numeric(14,2) kronor). Tied to a commission_periods row. No UPDATE/DELETE. A credit for a locked month is posted as a NEGATIVE adjustment in the current OPEN period referencing the original + credit invoices.';



CREATE TABLE IF NOT EXISTS "public"."commission_entries" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "invoice_id" "uuid",
    "user_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "paid_at_snapshot" timestamp with time zone NOT NULL,
    "amount_ex_vat_snapshot" numeric(14,2) NOT NULL,
    "vat_amount_snapshot" numeric(14,2) NOT NULL,
    "total_snapshot" numeric(14,2) NOT NULL,
    "invoice_number_snapshot" integer,
    "customer_id" "uuid" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "note" "text",
    CONSTRAINT "commission_entries_period_is_month_start" CHECK (("period_start" = ("date_trunc"('month'::"text", ("period_start")::timestamp with time zone))::"date"))
);


ALTER TABLE "public"."commission_entries" OWNER TO "postgres";


COMMENT ON TABLE "public"."commission_entries" IS 'Immutable per-invoice commission record (exactly one per invoice via UNIQUE invoice_id). Financials are numeric(14,2) kronor snapshots captured at payment-confirm time; never recomputed. No UPDATE/DELETE.';



COMMENT ON COLUMN "public"."commission_entries"."invoice_id" IS 'NULL for a standalone (invoice-less) commission payment recorded by an admin; set for an invoice-derived entry (confirm_invoice_paid).';



CREATE TABLE IF NOT EXISTS "public"."commission_periods" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "timezone" "text" DEFAULT 'Europe/Stockholm'::"text" NOT NULL,
    "status" "text" DEFAULT 'open'::"text" NOT NULL,
    "revenue_ex_vat_snapshot" numeric(14,2) DEFAULT 0 NOT NULL,
    "tier_rate_percent_snapshot" numeric(5,2) DEFAULT 0 NOT NULL,
    "earned_commission_snapshot" numeric(14,2) DEFAULT 0 NOT NULL,
    "adjustments_snapshot" numeric(14,2) DEFAULT 0 NOT NULL,
    "final_commission_snapshot" numeric(14,2) DEFAULT 0 NOT NULL,
    "approved_at" timestamp with time zone,
    "approved_by" "uuid",
    "paid_at" timestamp with time zone,
    "paid_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "commission_periods_month_start" CHECK (("period_start" = ("date_trunc"('month'::"text", ("period_start")::timestamp with time zone))::"date")),
    CONSTRAINT "commission_periods_period_order" CHECK (("period_end" >= "period_start")),
    CONSTRAINT "commission_periods_rate_range" CHECK ((("tier_rate_percent_snapshot" >= (0)::numeric) AND ("tier_rate_percent_snapshot" <= (100)::numeric))),
    CONSTRAINT "commission_periods_revenue_nonneg" CHECK (("revenue_ex_vat_snapshot" >= (0)::numeric)),
    CONSTRAINT "commission_periods_status_check" CHECK (("status" = ANY (ARRAY['open'::"text", 'approved'::"text", 'paid'::"text"]))),
    CONSTRAINT "commission_periods_status_coh" CHECK (((("status" = 'open'::"text") AND ("approved_at" IS NULL) AND ("paid_at" IS NULL)) OR (("status" = 'approved'::"text") AND ("approved_at" IS NOT NULL) AND ("paid_at" IS NULL)) OR (("status" = 'paid'::"text") AND ("approved_at" IS NOT NULL) AND ("paid_at" IS NOT NULL))))
);


ALTER TABLE "public"."commission_periods" OWNER TO "postgres";


COMMENT ON TABLE "public"."commission_periods" IS 'Per-user monthly commission rollup. Lifecycle open->approved->paid (one-way). Once status leaves open, financial snapshots + reverse transitions are frozen. final = earned + adjustments (numeric(14,2) kronor).';



CREATE TABLE IF NOT EXISTS "public"."commission_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "min_revenue_ex_vat" numeric(14,2) NOT NULL,
    "max_revenue_ex_vat" numeric(14,2),
    "rate_percent" numeric(5,2) NOT NULL,
    "sort_order" integer NOT NULL,
    "effective_from" "date" DEFAULT (("now"() AT TIME ZONE 'Europe/Stockholm'::"text"))::"date" NOT NULL,
    "effective_to" "date",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    CONSTRAINT "commission_tiers_effdates" CHECK ((("effective_to" IS NULL) OR ("effective_to" >= "effective_from"))),
    CONSTRAINT "commission_tiers_max_nonneg" CHECK ((("max_revenue_ex_vat" IS NULL) OR ("max_revenue_ex_vat" >= (0)::numeric))),
    CONSTRAINT "commission_tiers_min_nonneg" CHECK (("min_revenue_ex_vat" >= (0)::numeric)),
    CONSTRAINT "commission_tiers_range_valid" CHECK ((("max_revenue_ex_vat" IS NULL) OR ("max_revenue_ex_vat" > "min_revenue_ex_vat"))),
    CONSTRAINT "commission_tiers_rate_range" CHECK ((("rate_percent" >= (0)::numeric) AND ("rate_percent" <= (100)::numeric))),
    CONSTRAINT "commission_tiers_sort_nonneg" CHECK (("sort_order" >= 0))
);


ALTER TABLE "public"."commission_tiers" OWNER TO "postgres";


COMMENT ON TABLE "public"."commission_tiers" IS 'Revenue(ex-VAT, kronor) -> commission-rate tiers. Half-open [min,max); top tier max NULL. Achieved tier applies to the WHOLE month revenue. Admin-managed; versioned via effective_from/to.';



CREATE TABLE IF NOT EXISTS "public"."company_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_name" "text",
    "org_number" "text",
    "vat_number" "text",
    "address" "text",
    "postal_code" "text",
    "city" "text",
    "country" "text" DEFAULT 'Sverige'::"text",
    "email" "text",
    "phone" "text",
    "website" "text",
    "bankgiro" "text",
    "plusgiro" "text",
    "swish" "text",
    "bank_name" "text",
    "bank_account" "text",
    "iban" "text",
    "bic" "text"
);


ALTER TABLE "public"."company_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."contact_messages" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "name" "text" NOT NULL,
    "email" "text" NOT NULL,
    "phone" "text",
    "message" "text" NOT NULL,
    "is_read" boolean DEFAULT false
);


ALTER TABLE "public"."contact_messages" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customer_interactions" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    "type" "text" NOT NULL,
    "description" "text" NOT NULL,
    "created_by" "uuid",
    "email_id" "uuid",
    "call_outcome" "text",
    "request_id" "uuid",
    "archived_at" timestamp with time zone,
    CONSTRAINT "customer_interactions_call_outcome_check" CHECK ((("call_outcome" IS NULL) OR ("call_outcome" = ANY (ARRAY['interested'::"text", 'call_back'::"text", 'no_answer'::"text", 'not_interested'::"text"])))),
    CONSTRAINT "customer_interactions_type_check" CHECK (("type" = ANY (ARRAY['call'::"text", 'email'::"text", 'meeting'::"text", 'note'::"text", 'sale'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."customer_interactions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."customers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "first_name" "text" NOT NULL,
    "last_name" "text" NOT NULL,
    "email" "text",
    "phone" "text",
    "address" "text",
    "postal_code" "text",
    "city" "text",
    "company_name" "text",
    "org_number" "text",
    "budget" numeric(10,2),
    "wishes" "text",
    "notes" "text",
    "status" "text" DEFAULT 'lead'::"text",
    "has_purchased" boolean DEFAULT false,
    "has_service_agreement" boolean DEFAULT false,
    "service_type" "text",
    "service_start_date" "date",
    "service_renewal_date" "date",
    "source" "text",
    "created_by" "uuid",
    "meta_lead_id" "text",
    "fbclid" "text",
    "country" "text" DEFAULT 'Sverige'::"text",
    "facebook_lead_id" "text",
    "is_read" boolean DEFAULT false,
    "service_price" integer,
    "contact_person" "text",
    "position" "text",
    "category" "text",
    "instagram_url" "text",
    "website_url" "text",
    "import_batch_id" "uuid",
    "last_call_at" timestamp with time zone,
    "last_call_result" "text",
    "owner_user_id" "uuid",
    "archived_at" timestamp with time zone,
    "portal_user_id" "uuid",
    CONSTRAINT "customers_last_call_result_check" CHECK ((("last_call_result" IS NULL) OR ("last_call_result" = ANY (ARRAY['interested'::"text", 'call_back'::"text", 'no_answer'::"text", 'not_interested'::"text"])))),
    CONSTRAINT "customers_status_check" CHECK (("status" = ANY (ARRAY['lead'::"text", 'contacted'::"text", 'negotiating'::"text", 'customer'::"text", 'churned'::"text"])))
);


ALTER TABLE "public"."customers" OWNER TO "postgres";


COMMENT ON COLUMN "public"."customers"."service_price" IS 'Monthly price for service agreement in SEK';



CREATE TABLE IF NOT EXISTS "public"."domain_registrants" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "domain_id" "uuid" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "organization" "text",
    "email" "text",
    "phone" "text",
    "address_line1" "text",
    "address_line2" "text",
    "city" "text",
    "postal_code" "text",
    "state" "text",
    "country_code" "text",
    CONSTRAINT "domain_registrants_country_code_check" CHECK ((("country_code" IS NULL) OR ("country_code" ~ '^[A-Z]{2}$'::"text")))
);


ALTER TABLE "public"."domain_registrants" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."domains" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "name" "text" NOT NULL,
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "registrar" "text" DEFAULT 'manual'::"text" NOT NULL,
    "provider_domain_id" "text",
    "registered_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "auto_renew" boolean DEFAULT false NOT NULL,
    "locked" boolean DEFAULT false NOT NULL,
    "nameservers" "text"[] DEFAULT '{}'::"text"[] NOT NULL,
    "created_by" "uuid",
    "archived_at" timestamp with time zone,
    CONSTRAINT "domains_name_check" CHECK ((("name" = "lower"("name")) AND ("name" !~ '[[:space:]/@]'::"text") AND (("char_length"("name") >= 1) AND ("char_length"("name") <= 253)))),
    CONSTRAINT "domains_registrar_check" CHECK (("registrar" = ANY (ARRAY['manual'::"text", 'openprovider'::"text"]))),
    CONSTRAINT "domains_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'active'::"text", 'expired'::"text", 'suspended'::"text", 'transfer_pending'::"text", 'transferred_out'::"text", 'cancelled'::"text", 'failed'::"text"])))
);


ALTER TABLE "public"."domains" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."emails" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "message_id" "text",
    "thread_id" "text",
    "direction" "text" NOT NULL,
    "from_email" "text" NOT NULL,
    "from_name" "text",
    "to_email" "text" NOT NULL,
    "to_name" "text",
    "subject" "text",
    "body_text" "text",
    "body_html" "text",
    "is_read" boolean DEFAULT false,
    "is_starred" boolean DEFAULT false,
    "customer_id" "uuid",
    "email_date" timestamp with time zone,
    "sent_by" "uuid",
    "archived_at" timestamp with time zone,
    CONSTRAINT "emails_direction_check" CHECK (("direction" = ANY (ARRAY['inbound'::"text", 'outbound'::"text"])))
);


ALTER TABLE "public"."emails" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."invoices" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "timezone"('utc'::"text", "now"()) NOT NULL,
    "customer_id" "uuid" NOT NULL,
    "invoice_number" integer NOT NULL,
    "invoice_date" "date" DEFAULT CURRENT_DATE NOT NULL,
    "due_date" "date" NOT NULL,
    "period_start" "date" NOT NULL,
    "period_end" "date" NOT NULL,
    "amount" integer NOT NULL,
    "vat_rate" integer DEFAULT 25 NOT NULL,
    "vat_amount" integer NOT NULL,
    "total" integer NOT NULL,
    "description" "text",
    "status" "text" DEFAULT 'pending'::"text" NOT NULL,
    "sent_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "service_type" "text",
    "created_by" "uuid",
    "is_credit_note" boolean DEFAULT false,
    "original_invoice_id" "uuid",
    "salesperson_user_id" "uuid",
    CONSTRAINT "invoices_status_check" CHECK (("status" = ANY (ARRAY['pending'::"text", 'sent'::"text", 'paid'::"text", 'overdue'::"text", 'cancelled'::"text"])))
);


ALTER TABLE "public"."invoices" OWNER TO "postgres";


COMMENT ON COLUMN "public"."invoices"."is_credit_note" IS 'True if this is a credit note (kreditfaktura)';



COMMENT ON COLUMN "public"."invoices"."original_invoice_id" IS 'Reference to the original invoice being credited';



CREATE SEQUENCE IF NOT EXISTS "public"."invoices_invoice_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."invoices_invoice_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."invoices_invoice_number_seq" OWNED BY "public"."invoices"."invoice_number";



CREATE TABLE IF NOT EXISTS "public"."lead_import_batches" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "created_by" "uuid",
    "display_name" "text" NOT NULL,
    "original_filename" "text" NOT NULL,
    "file_type" "text" NOT NULL,
    "file_size" integer NOT NULL,
    "storage_path" "text" NOT NULL,
    "total_rows" integer DEFAULT 0 NOT NULL,
    "imported_rows" integer DEFAULT 0 NOT NULL,
    "duplicate_rows" integer DEFAULT 0 NOT NULL,
    "skipped_rows" integer DEFAULT 0 NOT NULL,
    "status" "text" DEFAULT 'completed'::"text" NOT NULL
);


ALTER TABLE "public"."lead_import_batches" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."lead_inbox" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "source" "text" NOT NULL,
    "external_id" "text",
    "status" "text" DEFAULT 'new'::"text" NOT NULL,
    "name" "text",
    "email" "text",
    "phone" "text",
    "company" "text",
    "message" "text",
    "raw" "jsonb",
    "assigned_to" "uuid",
    "assigned_by" "uuid",
    "assigned_at" timestamp with time zone,
    "customer_id" "uuid",
    "is_read" boolean DEFAULT false NOT NULL,
    CONSTRAINT "lead_inbox_source_check" CHECK (("source" = ANY (ARRAY['contact_form'::"text", 'facebook'::"text"]))),
    CONSTRAINT "lead_inbox_status_check" CHECK (("status" = ANY (ARRAY['new'::"text", 'assigned'::"text", 'archived'::"text"]))),
    CONSTRAINT "lead_inbox_status_fields" CHECK (
CASE "status"
    WHEN 'new'::"text" THEN (("assigned_to" IS NULL) AND ("assigned_by" IS NULL) AND ("assigned_at" IS NULL) AND ("customer_id" IS NULL))
    WHEN 'assigned'::"text" THEN (("assigned_to" IS NOT NULL) AND ("assigned_by" IS NOT NULL) AND ("assigned_at" IS NOT NULL) AND ("customer_id" IS NOT NULL))
    ELSE true
END)
);


ALTER TABLE "public"."lead_inbox" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."page_views" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "page_path" "text" NOT NULL,
    "page_title" "text",
    "visitor_id" "text" NOT NULL,
    "session_id" "text",
    "device_type" "text",
    "browser" "text",
    "os" "text",
    "referrer" "text",
    "source" "text",
    "utm_source" "text",
    "utm_medium" "text",
    "utm_campaign" "text",
    "country" "text",
    "city" "text",
    CONSTRAINT "page_views_device_type_check" CHECK (("device_type" = ANY (ARRAY['desktop'::"text", 'mobile'::"text", 'tablet'::"text"]))),
    CONSTRAINT "page_views_source_check" CHECK (("source" = ANY (ARRAY['direct'::"text", 'google'::"text", 'facebook'::"text", 'instagram'::"text", 'linkedin'::"text", 'other'::"text"])))
);


ALTER TABLE "public"."page_views" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."profiles" (
    "user_id" "uuid" NOT NULL,
    "role" "text" DEFAULT 'staff'::"text" NOT NULL,
    "is_active" boolean DEFAULT false NOT NULL,
    "commission_eligible" boolean DEFAULT false NOT NULL,
    "must_change_password" boolean DEFAULT false NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "email" "text",
    "phone" "text",
    "employment_start" "date",
    "employment_end" "date",
    "account_status" "text" DEFAULT 'invited'::"text" NOT NULL,
    "created_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "address_line" "text",
    "postal_code" "text",
    "city" "text",
    "country" "text",
    "job_title" "text",
    CONSTRAINT "profiles_account_status_check" CHECK (("account_status" = ANY (ARRAY['invited'::"text", 'active'::"text", 'suspended'::"text", 'ended'::"text"]))),
    CONSTRAINT "profiles_role_check" CHECK (("role" = ANY (ARRAY['admin'::"text", 'staff'::"text", 'customer'::"text"])))
);


ALTER TABLE "public"."profiles" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."purchases" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    "product_name" "text" NOT NULL,
    "description" "text",
    "amount" numeric(10,2) NOT NULL,
    "is_recurring" boolean DEFAULT false,
    "recurring_interval" "text",
    "created_by" "uuid",
    CONSTRAINT "purchases_recurring_interval_check" CHECK (("recurring_interval" = ANY (ARRAY['monthly'::"text", 'quarterly'::"text", 'yearly'::"text"])))
);


ALTER TABLE "public"."purchases" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaire_responses" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "questionnaire_id" "uuid",
    "industry" "text",
    "has_domain" boolean,
    "domain_name" "text",
    "wants_domain_help" boolean,
    "wants_maintenance" boolean,
    "page_count" "text",
    "has_content" boolean,
    "content_help_needed" "text",
    "features" "text"[],
    "other_features" "text",
    "design_preferences" "text",
    "reference_sites" "text",
    "budget_range" "text",
    "timeline" "text",
    "additional_info" "text",
    "domain_suggestions" "text"
);


ALTER TABLE "public"."questionnaire_responses" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."questionnaires" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    "public_token" "text" NOT NULL,
    "status" "text" DEFAULT 'sent'::"text",
    "sent_at" timestamp with time zone,
    "sent_to_email" "text",
    "opened_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "expires_at" timestamp with time zone,
    "created_by" "uuid",
    "response_read" boolean DEFAULT false
);


ALTER TABLE "public"."questionnaires" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quote_items" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "quote_id" "uuid",
    "description" "text" NOT NULL,
    "quantity" numeric(10,2) DEFAULT 1,
    "unit" "text" DEFAULT 'st'::"text",
    "unit_price" numeric(10,2) NOT NULL,
    "total" numeric(10,2) NOT NULL,
    "sort_order" integer DEFAULT 0,
    "details" "text",
    "archived_at" timestamp with time zone
);


ALTER TABLE "public"."quote_items" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."quotes" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "quote_number" integer NOT NULL,
    "customer_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "valid_from" "date" DEFAULT CURRENT_DATE,
    "valid_until" "date",
    "status" "text" DEFAULT 'draft'::"text",
    "subtotal" numeric(10,2) DEFAULT 0,
    "vat_rate" numeric(5,2) DEFAULT 25.00,
    "vat_amount" numeric(10,2) DEFAULT 0,
    "total" numeric(10,2) DEFAULT 0,
    "notes" "text",
    "terms" "text",
    "sent_at" timestamp with time zone,
    "sent_to_email" "text",
    "created_by" "uuid",
    "public_token" "text",
    "customer_response_at" timestamp with time zone,
    "customer_response_note" "text",
    "response_read" boolean DEFAULT false,
    "owner_user_id" "uuid",
    "archived_at" timestamp with time zone,
    CONSTRAINT "quotes_status_check" CHECK (("status" = ANY (ARRAY['draft'::"text", 'sent'::"text", 'accepted'::"text", 'declined'::"text", 'expired'::"text"])))
);


ALTER TABLE "public"."quotes" OWNER TO "postgres";


CREATE SEQUENCE IF NOT EXISTS "public"."quotes_quote_number_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE "public"."quotes_quote_number_seq" OWNER TO "postgres";


ALTER SEQUENCE "public"."quotes_quote_number_seq" OWNED BY "public"."quotes"."quote_number";



CREATE TABLE IF NOT EXISTS "public"."reminders" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "customer_id" "uuid",
    "title" "text" NOT NULL,
    "description" "text",
    "reminder_date" "date" NOT NULL,
    "reminder_time" time without time zone,
    "type" "text" DEFAULT 'general'::"text",
    "is_completed" boolean DEFAULT false,
    "completed_at" timestamp with time zone,
    "is_recurring" boolean DEFAULT false,
    "recurring_interval" "text",
    "created_by" "uuid",
    "notification_sent" boolean DEFAULT false,
    "notification_sent_at" timestamp with time zone,
    CONSTRAINT "reminders_recurring_interval_check" CHECK (("recurring_interval" = ANY (ARRAY['weekly'::"text", 'monthly'::"text", 'quarterly'::"text", 'yearly'::"text"]))),
    CONSTRAINT "reminders_type_check" CHECK (("type" = ANY (ARRAY['general'::"text", 'follow_up'::"text", 'service_update'::"text", 'renewal'::"text", 'upsell'::"text"])))
);


ALTER TABLE "public"."reminders" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salesperson_commission_settings" (
    "user_id" "uuid" NOT NULL,
    "base_salary" numeric(12,2),
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_by" "uuid",
    CONSTRAINT "scs_base_salary_nonneg" CHECK ((("base_salary" IS NULL) OR ("base_salary" >= (0)::numeric)))
);


ALTER TABLE "public"."salesperson_commission_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."salesperson_commission_tiers" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sort_order" integer NOT NULL,
    "min_revenue_ex_vat" numeric(14,2) NOT NULL,
    "max_revenue_ex_vat" numeric(14,2),
    "rate_percent" numeric(5,2) NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    "updated_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "scti_min_nonneg" CHECK (("min_revenue_ex_vat" >= (0)::numeric)),
    CONSTRAINT "scti_range_valid" CHECK ((("max_revenue_ex_vat" IS NULL) OR ("max_revenue_ex_vat" >= "min_revenue_ex_vat"))),
    CONSTRAINT "scti_rate_range" CHECK ((("rate_percent" >= (0)::numeric) AND ("rate_percent" <= (100)::numeric)))
);


ALTER TABLE "public"."salesperson_commission_tiers" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_permissions" (
    "user_id" "uuid" NOT NULL,
    "permission" "text" NOT NULL,
    "granted_by" "uuid",
    "created_at" timestamp with time zone DEFAULT "now"() NOT NULL,
    CONSTRAINT "user_permissions_permission_check" CHECK (("permission" = ANY (ARRAY['crm.access'::"text", 'customers.view_own'::"text", 'customers.create'::"text", 'customers.update_own'::"text", 'quotes.view_own'::"text", 'quotes.create'::"text", 'quotes.update_own'::"text", 'emails.send'::"text", 'reminders.manage_own'::"text", 'attachments.upload'::"text"])))
);


ALTER TABLE "public"."user_permissions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "user_id" "uuid",
    "sidebar_order" "jsonb",
    "email_signature" "text",
    "logo_height" integer DEFAULT 32,
    "logo_position" "text" DEFAULT 'left'::"text",
    "username" "text",
    "email" "text"
);


ALTER TABLE "public"."user_preferences" OWNER TO "postgres";


ALTER TABLE ONLY "public"."invoices" ALTER COLUMN "invoice_number" SET DEFAULT "nextval"('"public"."invoices_invoice_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."quotes" ALTER COLUMN "quote_number" SET DEFAULT "nextval"('"public"."quotes_quote_number_seq"'::"regclass");



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."audit_log"
    ADD CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_agent_id_key" UNIQUE ("agent_id");



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."code_snippets"
    ADD CONSTRAINT "code_snippets_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_invoice_id_key" UNIQUE ("invoice_id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_unique_user_period" UNIQUE ("user_id", "period_start");



ALTER TABLE ONLY "public"."commission_tiers"
    ADD CONSTRAINT "commission_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."company_settings"
    ADD CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."contact_messages"
    ADD CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_facebook_lead_id_key" UNIQUE ("facebook_lead_id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domain_registrants"
    ADD CONSTRAINT "domain_registrants_domain_id_key" UNIQUE ("domain_id");



ALTER TABLE ONLY "public"."domain_registrants"
    ADD CONSTRAINT "domain_registrants_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_message_id_key" UNIQUE ("message_id");



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_import_batches"
    ADD CONSTRAINT "lead_import_batches_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."lead_inbox"
    ADD CONSTRAINT "lead_inbox_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."page_views"
    ADD CONSTRAINT "page_views_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_public_token_key" UNIQUE ("public_token");



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salesperson_commission_settings"
    ADD CONSTRAINT "salesperson_commission_settings_pkey" PRIMARY KEY ("user_id");



ALTER TABLE ONLY "public"."salesperson_commission_tiers"
    ADD CONSTRAINT "salesperson_commission_tiers_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."salesperson_commission_tiers"
    ADD CONSTRAINT "salesperson_commission_tiers_user_id_sort_order_key" UNIQUE ("user_id", "sort_order");



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_pkey" PRIMARY KEY ("user_id", "permission");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_username_key" UNIQUE ("username");



CREATE INDEX "idx_attachments_created_at" ON "public"."attachments" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_attachments_entity" ON "public"."attachments" USING "btree" ("entity_type", "entity_id");



CREATE INDEX "idx_call_sessions_active_customer_id" ON "public"."call_sessions" USING "btree" ("active_customer_id");



CREATE INDEX "idx_call_sessions_agent_id" ON "public"."call_sessions" USING "btree" ("agent_id");



CREATE INDEX "idx_code_snippets_created_at" ON "public"."code_snippets" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_code_snippets_created_by" ON "public"."code_snippets" USING "btree" ("created_by");



CREATE INDEX "idx_code_snippets_is_favorite" ON "public"."code_snippets" USING "btree" ("is_favorite");



CREATE INDEX "idx_code_snippets_language" ON "public"."code_snippets" USING "btree" ("language");



CREATE INDEX "idx_code_snippets_tags" ON "public"."code_snippets" USING "gin" ("tags");



CREATE INDEX "idx_commission_adjustments_period" ON "public"."commission_adjustments" USING "btree" ("period_id");



CREATE INDEX "idx_commission_adjustments_src_inv" ON "public"."commission_adjustments" USING "btree" ("source_invoice_id");



CREATE INDEX "idx_commission_adjustments_user" ON "public"."commission_adjustments" USING "btree" ("user_id");



CREATE INDEX "idx_commission_entries_customer" ON "public"."commission_entries" USING "btree" ("customer_id");



CREATE INDEX "idx_commission_entries_period" ON "public"."commission_entries" USING "btree" ("period_start");



CREATE INDEX "idx_commission_entries_user" ON "public"."commission_entries" USING "btree" ("user_id");



CREATE INDEX "idx_commission_entries_user_period" ON "public"."commission_entries" USING "btree" ("user_id", "period_start");



CREATE INDEX "idx_commission_periods_status" ON "public"."commission_periods" USING "btree" ("status");



CREATE INDEX "idx_commission_periods_user" ON "public"."commission_periods" USING "btree" ("user_id");



CREATE INDEX "idx_commission_periods_user_period" ON "public"."commission_periods" USING "btree" ("user_id", "period_start");



CREATE INDEX "idx_commission_tiers_effective" ON "public"."commission_tiers" USING "btree" ("effective_from", "effective_to");



CREATE INDEX "idx_customer_interactions_created_by" ON "public"."customer_interactions" USING "btree" ("created_by");



CREATE INDEX "idx_customer_interactions_customer_id" ON "public"."customer_interactions" USING "btree" ("customer_id");



CREATE INDEX "idx_customer_interactions_email_id" ON "public"."customer_interactions" USING "btree" ("email_id");



CREATE INDEX "idx_customers_archived" ON "public"."customers" USING "btree" ("archived_at");



CREATE INDEX "idx_customers_created_by" ON "public"."customers" USING "btree" ("created_by");



CREATE INDEX "idx_customers_facebook_lead_id" ON "public"."customers" USING "btree" ("facebook_lead_id");



CREATE INDEX "idx_customers_has_purchased" ON "public"."customers" USING "btree" ("has_purchased");



CREATE INDEX "idx_customers_import_batch_id" ON "public"."customers" USING "btree" ("import_batch_id");



CREATE INDEX "idx_customers_owner" ON "public"."customers" USING "btree" ("owner_user_id");



CREATE INDEX "idx_customers_status" ON "public"."customers" USING "btree" ("status");



CREATE INDEX "idx_domain_registrants_domain_id" ON "public"."domain_registrants" USING "btree" ("domain_id");



CREATE INDEX "idx_domains_archived" ON "public"."domains" USING "btree" ("archived_at");



CREATE INDEX "idx_domains_customer_id" ON "public"."domains" USING "btree" ("customer_id");



CREATE INDEX "idx_domains_expires_at" ON "public"."domains" USING "btree" ("expires_at");



CREATE INDEX "idx_domains_provider" ON "public"."domains" USING "btree" ("provider_domain_id") WHERE ("provider_domain_id" IS NOT NULL);



CREATE INDEX "idx_domains_status" ON "public"."domains" USING "btree" ("status");



CREATE INDEX "idx_emails_customer_id" ON "public"."emails" USING "btree" ("customer_id");



CREATE INDEX "idx_emails_sent_by" ON "public"."emails" USING "btree" ("sent_by");



CREATE INDEX "idx_invoices_created_by" ON "public"."invoices" USING "btree" ("created_by");



CREATE INDEX "idx_invoices_salesperson" ON "public"."invoices" USING "btree" ("salesperson_user_id");



CREATE INDEX "idx_lead_inbox_created" ON "public"."lead_inbox" USING "btree" ("created_at" DESC);



CREATE INDEX "idx_lead_inbox_status" ON "public"."lead_inbox" USING "btree" ("status");



CREATE INDEX "idx_page_views_created_at" ON "public"."page_views" USING "btree" ("created_at");



CREATE INDEX "idx_page_views_device" ON "public"."page_views" USING "btree" ("device_type");



CREATE INDEX "idx_page_views_source" ON "public"."page_views" USING "btree" ("source");



CREATE INDEX "idx_profiles_account_status" ON "public"."profiles" USING "btree" ("account_status");



CREATE INDEX "idx_profiles_active" ON "public"."profiles" USING "btree" ("user_id") WHERE ("is_active" AND ("account_status" = 'active'::"text"));



CREATE INDEX "idx_profiles_role" ON "public"."profiles" USING "btree" ("role");



CREATE INDEX "idx_purchases_created_by" ON "public"."purchases" USING "btree" ("created_by");



CREATE INDEX "idx_purchases_customer_id" ON "public"."purchases" USING "btree" ("customer_id");



CREATE INDEX "idx_questionnaire_responses_questionnaire_id" ON "public"."questionnaire_responses" USING "btree" ("questionnaire_id");



CREATE INDEX "idx_questionnaires_created_by" ON "public"."questionnaires" USING "btree" ("created_by");



CREATE INDEX "idx_questionnaires_customer_id" ON "public"."questionnaires" USING "btree" ("customer_id");



CREATE INDEX "idx_quote_items_quote_id" ON "public"."quote_items" USING "btree" ("quote_id");



CREATE INDEX "idx_quotes_archived" ON "public"."quotes" USING "btree" ("archived_at");



CREATE INDEX "idx_quotes_created_by" ON "public"."quotes" USING "btree" ("created_by");



CREATE INDEX "idx_quotes_customer_id" ON "public"."quotes" USING "btree" ("customer_id");



CREATE INDEX "idx_quotes_owner" ON "public"."quotes" USING "btree" ("owner_user_id");



CREATE INDEX "idx_quotes_public_token" ON "public"."quotes" USING "btree" ("public_token");



CREATE INDEX "idx_reminders_completed" ON "public"."reminders" USING "btree" ("is_completed");



CREATE INDEX "idx_reminders_created_by" ON "public"."reminders" USING "btree" ("created_by");



CREATE INDEX "idx_reminders_customer_id" ON "public"."reminders" USING "btree" ("customer_id");



CREATE INDEX "idx_reminders_date" ON "public"."reminders" USING "btree" ("reminder_date");



CREATE INDEX "idx_user_preferences_user_id" ON "public"."user_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_preferences_username" ON "public"."user_preferences" USING "btree" ("username");



CREATE INDEX "invoices_customer_id_idx" ON "public"."invoices" USING "btree" ("customer_id");



CREATE INDEX "invoices_due_date_idx" ON "public"."invoices" USING "btree" ("due_date");



CREATE INDEX "invoices_invoice_date_idx" ON "public"."invoices" USING "btree" ("invoice_date");



CREATE INDEX "invoices_original_invoice_id_idx" ON "public"."invoices" USING "btree" ("original_invoice_id");



CREATE INDEX "invoices_status_idx" ON "public"."invoices" USING "btree" ("status");



CREATE UNIQUE INDEX "lead_inbox_source_external_id_unique" ON "public"."lead_inbox" USING "btree" ("source", "external_id") WHERE ("external_id" IS NOT NULL);



CREATE INDEX "scti_user_min_idx" ON "public"."salesperson_commission_tiers" USING "btree" ("user_id", "min_revenue_ex_vat");



CREATE UNIQUE INDEX "uq_commission_tiers_active_min" ON "public"."commission_tiers" USING "btree" ("min_revenue_ex_vat") WHERE ("effective_to" IS NULL);



CREATE UNIQUE INDEX "uq_commission_tiers_active_sort" ON "public"."commission_tiers" USING "btree" ("sort_order") WHERE ("effective_to" IS NULL);



CREATE UNIQUE INDEX "uq_customer_interactions_created_by_request_id" ON "public"."customer_interactions" USING "btree" ("created_by", "request_id") WHERE ("request_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_customers_portal_user_id" ON "public"."customers" USING "btree" ("portal_user_id") WHERE ("portal_user_id" IS NOT NULL);



CREATE UNIQUE INDEX "uq_domains_name" ON "public"."domains" USING "btree" ("name");



CREATE OR REPLACE TRIGGER "on_preferences_insert_sync_email" BEFORE INSERT ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."sync_email_on_preferences_insert"();



CREATE OR REPLACE TRIGGER "trg_audit_domain_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."domains" FOR EACH ROW EXECUTE FUNCTION "public"."audit_domain_change"();



CREATE OR REPLACE TRIGGER "trg_audit_domain_registrant_change" AFTER INSERT OR DELETE OR UPDATE ON "public"."domain_registrants" FOR EACH ROW EXECUTE FUNCTION "public"."audit_domain_registrant_change"();



CREATE OR REPLACE TRIGGER "trg_audit_immutable" BEFORE DELETE OR UPDATE ON "public"."audit_log" FOR EACH ROW EXECUTE FUNCTION "public"."audit_immutable"();



CREATE OR REPLACE TRIGGER "trg_audit_permission_del" AFTER DELETE ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_permission_change"();



CREATE OR REPLACE TRIGGER "trg_audit_permission_ins" AFTER INSERT ON "public"."user_permissions" FOR EACH ROW EXECUTE FUNCTION "public"."audit_permission_change"();



CREATE OR REPLACE TRIGGER "trg_audit_profile_change" AFTER UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_profile_change"();



CREATE OR REPLACE TRIGGER "trg_audit_profile_insert" AFTER INSERT ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."audit_profile_insert"();



CREATE OR REPLACE TRIGGER "trg_commission_adjustments_immutable" BEFORE DELETE OR UPDATE ON "public"."commission_adjustments" FOR EACH ROW EXECUTE FUNCTION "public"."commission_immutable"();



CREATE OR REPLACE TRIGGER "trg_commission_entries_immutable" BEFORE DELETE OR UPDATE ON "public"."commission_entries" FOR EACH ROW EXECUTE FUNCTION "public"."commission_immutable"();



CREATE OR REPLACE TRIGGER "trg_commission_periods_lifecycle" BEFORE UPDATE ON "public"."commission_periods" FOR EACH ROW EXECUTE FUNCTION "public"."protect_commission_period"();



CREATE OR REPLACE TRIGGER "trg_commission_periods_updated_at" BEFORE UPDATE ON "public"."commission_periods" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_customers_protect" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."protect_customer_columns"();



CREATE OR REPLACE TRIGGER "trg_domain_registrants_updated_at" BEFORE UPDATE ON "public"."domain_registrants" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_domains_updated_at" BEFORE UPDATE ON "public"."domains" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_profiles_updated_at" BEFORE UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "trg_protect_invoice_salesperson" BEFORE UPDATE ON "public"."invoices" FOR EACH ROW EXECUTE FUNCTION "public"."protect_invoice_salesperson"();



CREATE OR REPLACE TRIGGER "trg_protect_profiles" BEFORE DELETE OR UPDATE ON "public"."profiles" FOR EACH ROW EXECUTE FUNCTION "public"."protect_profiles"();



CREATE OR REPLACE TRIGGER "trg_protect_quote_fields" BEFORE UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."protect_quote_fields"();



CREATE OR REPLACE TRIGGER "trg_protect_quote_insert" BEFORE INSERT ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."protect_quote_insert"();



CREATE OR REPLACE TRIGGER "trg_quote_item_total" BEFORE INSERT OR UPDATE ON "public"."quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."quote_item_total"();



CREATE OR REPLACE TRIGGER "trg_quote_items_recalc" AFTER INSERT OR DELETE OR UPDATE ON "public"."quote_items" FOR EACH ROW EXECUTE FUNCTION "public"."quote_items_recalc"();



CREATE OR REPLACE TRIGGER "trg_quotes_vat_recalc" AFTER UPDATE ON "public"."quotes" FOR EACH ROW EXECUTE FUNCTION "public"."quotes_vat_recalc"();



CREATE OR REPLACE TRIGGER "update_customers_updated_at" BEFORE UPDATE ON "public"."customers" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_preferences_updated_at" BEFORE UPDATE ON "public"."user_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



ALTER TABLE ONLY "public"."attachments"
    ADD CONSTRAINT "attachments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_active_customer_id_fkey" FOREIGN KEY ("active_customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."call_sessions"
    ADD CONSTRAINT "call_sessions_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."code_snippets"
    ADD CONSTRAINT "code_snippets_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "public"."commission_periods"("id");



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_source_credit_invoice_id_fkey" FOREIGN KEY ("source_credit_invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_source_invoice_id_fkey" FOREIGN KEY ("source_invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."commission_adjustments"
    ADD CONSTRAINT "commission_adjustments_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."commission_entries"
    ADD CONSTRAINT "commission_entries_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_paid_by_fkey" FOREIGN KEY ("paid_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_periods"
    ADD CONSTRAINT "commission_periods_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."commission_tiers"
    ADD CONSTRAINT "commission_tiers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."customer_interactions"
    ADD CONSTRAINT "customer_interactions_email_id_fkey" FOREIGN KEY ("email_id") REFERENCES "public"."emails"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_import_batch_id_fkey" FOREIGN KEY ("import_batch_id") REFERENCES "public"."lead_import_batches"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."customers"
    ADD CONSTRAINT "customers_portal_user_id_fkey" FOREIGN KEY ("portal_user_id") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."domain_registrants"
    ADD CONSTRAINT "domain_registrants_domain_id_fkey" FOREIGN KEY ("domain_id") REFERENCES "public"."domains"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."domains"
    ADD CONSTRAINT "domains_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."emails"
    ADD CONSTRAINT "emails_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_original_invoice_id_fkey" FOREIGN KEY ("original_invoice_id") REFERENCES "public"."invoices"("id");



ALTER TABLE ONLY "public"."invoices"
    ADD CONSTRAINT "invoices_salesperson_user_id_fkey" FOREIGN KEY ("salesperson_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."lead_import_batches"
    ADD CONSTRAINT "lead_import_batches_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."lead_inbox"
    ADD CONSTRAINT "lead_inbox_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lead_inbox"
    ADD CONSTRAINT "lead_inbox_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "public"."profiles"("user_id") ON DELETE RESTRICT;



ALTER TABLE ONLY "public"."lead_inbox"
    ADD CONSTRAINT "lead_inbox_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."profiles"
    ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."purchases"
    ADD CONSTRAINT "purchases_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaire_responses"
    ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey" FOREIGN KEY ("questionnaire_id") REFERENCES "public"."questionnaires"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."questionnaires"
    ADD CONSTRAINT "questionnaires_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quote_items"
    ADD CONSTRAINT "quote_items_quote_id_fkey" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."quotes"
    ADD CONSTRAINT "quotes_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."reminders"
    ADD CONSTRAINT "reminders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salesperson_commission_settings"
    ADD CONSTRAINT "salesperson_commission_settings_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."salesperson_commission_tiers"
    ADD CONSTRAINT "salesperson_commission_tiers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id") ON DELETE SET NULL;



ALTER TABLE ONLY "public"."user_permissions"
    ADD CONSTRAINT "user_permissions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("user_id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_preferences"
    ADD CONSTRAINT "user_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Admins can delete interactions" ON "public"."customer_interactions" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "Agents can delete own call session" ON "public"."call_sessions" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "agent_id"));



CREATE POLICY "Agents can insert own call session" ON "public"."call_sessions" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "agent_id"));



CREATE POLICY "Agents can read own call session" ON "public"."call_sessions" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "agent_id"));



CREATE POLICY "Agents can update own call session" ON "public"."call_sessions" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "agent_id")) WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "agent_id"));



CREATE POLICY "Allow anonymous to insert contact_messages" ON "public"."contact_messages" FOR INSERT TO "anon" WITH CHECK (("id" IS NOT NULL));



CREATE POLICY "Allow authenticated users to delete code_snippets" ON "public"."code_snippets" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Allow authenticated users to insert code_snippets" ON "public"."code_snippets" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Allow authenticated users to read code_snippets" ON "public"."code_snippets" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Allow authenticated users to update code_snippets" ON "public"."code_snippets" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can insert company settings" ON "public"."company_settings" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Authenticated users can read company settings" ON "public"."company_settings" FOR SELECT TO "authenticated" USING (true);



CREATE POLICY "Authenticated users can update company settings" ON "public"."company_settings" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "Users can delete own import batches" ON "public"."lead_import_batches" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Users can delete own preferences" ON "public"."user_preferences" FOR DELETE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can insert own import batches" ON "public"."lead_import_batches" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Users can insert own preferences" ON "public"."user_preferences" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can read own import batches" ON "public"."lead_import_batches" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "created_by"));



CREATE POLICY "Users can read own preferences" ON "public"."user_preferences" FOR SELECT TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "Users can update own preferences" ON "public"."user_preferences" FOR UPDATE TO "authenticated" USING ((( SELECT "auth"."uid"() AS "uid") = "user_id"));



CREATE POLICY "anon_insert_page_views" ON "public"."page_views" FOR INSERT TO "anon" WITH CHECK (("visitor_id" IS NOT NULL));



ALTER TABLE "public"."attachments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "attachments_delete" ON "public"."attachments" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "attachments_insert" ON "public"."attachments" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."has_permission"('attachments.upload'::"text") AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ((("entity_type" = 'customer'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "attachments"."entity_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL))))) OR (("entity_type" = 'quote'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "attachments"."entity_id") AND ("q"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."archived_at" IS NULL)))))))));



CREATE POLICY "attachments_select" ON "public"."attachments" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND ((("entity_type" = 'customer'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "attachments"."entity_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL))))) OR (("entity_type" = 'quote'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "attachments"."entity_id") AND ("q"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."archived_at" IS NULL)))))))));



CREATE POLICY "attachments_update" ON "public"."attachments" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."audit_log" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "audit_select" ON "public"."audit_log" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "auth_insert_page_views" ON "public"."page_views" FOR INSERT TO "authenticated" WITH CHECK ((( SELECT "auth"."uid"() AS "uid") IS NOT NULL));



CREATE POLICY "auth_read_page_views" ON "public"."page_views" FOR SELECT TO "authenticated" USING (true);



ALTER TABLE "public"."call_sessions" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "call_sessions_delete_own" ON "public"."call_sessions" FOR DELETE USING (("agent_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "call_sessions_insert_own" ON "public"."call_sessions" FOR INSERT WITH CHECK (("agent_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "call_sessions_select_own" ON "public"."call_sessions" FOR SELECT USING (("agent_id" = ( SELECT "auth"."uid"() AS "uid")));



CREATE POLICY "call_sessions_update_own" ON "public"."call_sessions" FOR UPDATE USING (("agent_id" = ( SELECT "auth"."uid"() AS "uid"))) WITH CHECK (("agent_id" = ( SELECT "auth"."uid"() AS "uid")));



ALTER TABLE "public"."code_snippets" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."commission_adjustments" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commission_adjustments_select" ON "public"."commission_adjustments" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())));



ALTER TABLE "public"."commission_entries" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commission_entries_select" ON "public"."commission_entries" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())));



ALTER TABLE "public"."commission_periods" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commission_periods_select" ON "public"."commission_periods" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())));



ALTER TABLE "public"."commission_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "commission_tiers_select" ON "public"."commission_tiers" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR "public"."is_active_user"()));



CREATE POLICY "commission_tiers_write" ON "public"."commission_tiers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."company_settings" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_delete" ON "public"."contact_messages" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."contact_messages" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "contact_select" ON "public"."contact_messages" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "contact_update" ON "public"."contact_messages" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."customer_interactions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."customers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "customers_insert" ON "public"."customers" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND ("archived_at" IS NULL) AND "public"."has_permission"('customers.create'::"text"))));



CREATE POLICY "customers_select" ON "public"."customers" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("archived_at" IS NULL) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('customers.view_own'::"text"))));



CREATE POLICY "customers_update" ON "public"."customers" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (("archived_at" IS NULL) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('customers.update_own'::"text")))) WITH CHECK (("public"."is_admin"() OR ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid"))));



ALTER TABLE "public"."domain_registrants" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "domain_registrants_select" ON "public"."domain_registrants" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."domains" "d"
  WHERE (("d"."id" = "domain_registrants"."domain_id") AND "public"."is_portal_customer_of"("d"."customer_id")))))));



CREATE POLICY "domain_registrants_write" ON "public"."domain_registrants" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."domains" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "domains_select" ON "public"."domains" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND "public"."is_portal_customer_of"("customer_id"))));



CREATE POLICY "domains_write" ON "public"."domains" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."emails" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "emails_insert" ON "public"."emails" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("sent_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('emails.send'::"text") AND (("customer_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "emails"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL))))))));



CREATE POLICY "emails_select" ON "public"."emails" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (("sent_by" = ( SELECT "auth"."uid"() AS "uid")) OR (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "emails"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL))))))));



CREATE POLICY "emails_update" ON "public"."emails" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "interactions_insert" ON "public"."customer_interactions" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_interactions"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "interactions_select" ON "public"."customer_interactions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "customer_interactions"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "interactions_update" ON "public"."customer_interactions" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."invoices" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "invoices_delete" ON "public"."invoices" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "invoices_insert" ON "public"."invoices" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "invoices_select" ON "public"."invoices" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "invoices"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "invoices_update" ON "public"."invoices" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."lead_import_batches" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."lead_inbox" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "lead_inbox_select" ON "public"."lead_inbox" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "lead_inbox_update" ON "public"."lead_inbox" FOR UPDATE TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."page_views" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "perms_select" ON "public"."user_permissions" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())));



CREATE POLICY "perms_write" ON "public"."user_permissions" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."profiles" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "profiles_select" ON "public"."profiles" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."is_active_user"())));



CREATE POLICY "profiles_write" ON "public"."profiles" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."purchases" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "purchases_insert" ON "public"."purchases" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "purchases_select" ON "public"."purchases" FOR SELECT TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "purchases_update" ON "public"."purchases" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "qr_delete" ON "public"."questionnaire_responses" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "qr_insert" ON "public"."questionnaire_responses" FOR INSERT TO "authenticated" WITH CHECK ("public"."is_admin"());



CREATE POLICY "qr_select" ON "public"."questionnaire_responses" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM ("public"."questionnaires" "q"
     JOIN "public"."customers" "c" ON (("c"."id" = "q"."customer_id")))
  WHERE (("q"."id" = "questionnaire_responses"."questionnaire_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "qr_update" ON "public"."questionnaire_responses" FOR UPDATE TO "authenticated" USING ("public"."is_admin"());



ALTER TABLE "public"."questionnaire_responses" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."questionnaires" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "questionnaires_delete" ON "public"."questionnaires" FOR DELETE TO "authenticated" USING ("public"."is_admin"());



CREATE POLICY "questionnaires_insert" ON "public"."questionnaires" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "questionnaires"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "questionnaires_select" ON "public"."questionnaires" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "questionnaires"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "questionnaires_update" ON "public"."questionnaires" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."is_active_user"() AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "questionnaires"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



ALTER TABLE "public"."quote_items" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quote_items_insert" ON "public"."quote_items" FOR INSERT TO "authenticated" WITH CHECK ((("archived_at" IS NULL) AND ("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."archived_at" IS NULL) AND ("q"."status" = 'draft'::"text") AND "public"."has_permission"('quotes.create'::"text")))))));



CREATE POLICY "quote_items_select" ON "public"."quote_items" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."archived_at" IS NULL) AND "public"."has_permission"('quotes.view_own'::"text"))))));



CREATE POLICY "quote_items_update" ON "public"."quote_items" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (EXISTS ( SELECT 1
   FROM "public"."quotes" "q"
  WHERE (("q"."id" = "quote_items"."quote_id") AND ("q"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("q"."archived_at" IS NULL) AND ("q"."status" = 'draft'::"text") AND "public"."has_permission"('quotes.update_own'::"text"))))));



ALTER TABLE "public"."quotes" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "quotes_insert" ON "public"."quotes" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("created_by" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('quotes.create'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "quotes"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "quotes_select" ON "public"."quotes" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR (("archived_at" IS NULL) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('quotes.view_own'::"text"))));



CREATE POLICY "quotes_update" ON "public"."quotes" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR (("archived_at" IS NULL) AND ("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND "public"."has_permission"('quotes.update_own'::"text")))) WITH CHECK (("public"."is_admin"() OR (("owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND (("customer_id" IS NULL) OR (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "quotes"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")))))))));



ALTER TABLE "public"."reminders" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "reminders_delete" ON "public"."reminders" FOR DELETE TO "authenticated" USING (("public"."is_admin"() OR ("public"."has_permission"('reminders.manage_own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reminders"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "reminders_insert" ON "public"."reminders" FOR INSERT TO "authenticated" WITH CHECK (("public"."is_admin"() OR ("public"."has_permission"('reminders.manage_own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reminders"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "reminders_select" ON "public"."reminders" FOR SELECT TO "authenticated" USING (("public"."is_admin"() OR ("public"."has_permission"('reminders.manage_own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reminders"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



CREATE POLICY "reminders_update" ON "public"."reminders" FOR UPDATE TO "authenticated" USING (("public"."is_admin"() OR ("public"."has_permission"('reminders.manage_own'::"text") AND (EXISTS ( SELECT 1
   FROM "public"."customers" "c"
  WHERE (("c"."id" = "reminders"."customer_id") AND ("c"."owner_user_id" = ( SELECT "auth"."uid"() AS "uid")) AND ("c"."archived_at" IS NULL)))))));



ALTER TABLE "public"."salesperson_commission_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."salesperson_commission_tiers" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "scs_admin_all" ON "public"."salesperson_commission_settings" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



CREATE POLICY "scti_admin_all" ON "public"."salesperson_commission_tiers" TO "authenticated" USING ("public"."is_admin"()) WITH CHECK ("public"."is_admin"());



ALTER TABLE "public"."user_permissions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_preferences" ENABLE ROW LEVEL SECURITY;




ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."call_sessions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customer_interactions";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."customers";



ALTER PUBLICATION "supabase_realtime" ADD TABLE ONLY "public"."reminders";



GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";






















































































































































REVOKE ALL ON FUNCTION "public"."approve_commission_period"("p_period_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."approve_commission_period"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."approve_commission_period"("p_period_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."assign_lead"("p_lead" "uuid", "p_staff" "uuid", "p_first_name" "text", "p_last_name" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."assign_lead"("p_lead" "uuid", "p_staff" "uuid", "p_first_name" "text", "p_last_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_lead"("p_lead" "uuid", "p_staff" "uuid", "p_first_name" "text", "p_last_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_domain_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_domain_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_domain_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_domain_registrant_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_domain_registrant_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_domain_registrant_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_immutable"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_permission_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_permission_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_permission_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_profile_change"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_profile_change"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_profile_change"() TO "service_role";



GRANT ALL ON FUNCTION "public"."audit_profile_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."audit_profile_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."audit_profile_insert"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."commission_immutable"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."commission_immutable"() TO "anon";
GRANT ALL ON FUNCTION "public"."commission_immutable"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_immutable"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."commission_next_tier_gap"("p_user_id" "uuid", "p_revenue" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."commission_next_tier_gap"("p_user_id" "uuid", "p_revenue" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_next_tier_gap"("p_user_id" "uuid", "p_revenue" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."commission_rate_for"("p_user_id" "uuid", "p_revenue" numeric) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."commission_rate_for"("p_user_id" "uuid", "p_revenue" numeric) TO "authenticated";
GRANT ALL ON FUNCTION "public"."commission_rate_for"("p_user_id" "uuid", "p_revenue" numeric) TO "service_role";



REVOKE ALL ON FUNCTION "public"."confirm_invoice_paid"("p_invoice_id" "uuid", "p_salesperson_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."confirm_invoice_paid"("p_invoice_id" "uuid", "p_salesperson_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."confirm_invoice_paid"("p_invoice_id" "uuid", "p_salesperson_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_commission_adjustment"("p_user_id" "uuid", "p_period_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_adjustment_type" "text", "p_source_invoice_id" "uuid", "p_source_credit_invoice_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_commission_adjustment"("p_user_id" "uuid", "p_period_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_adjustment_type" "text", "p_source_invoice_id" "uuid", "p_source_credit_invoice_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_commission_adjustment"("p_user_id" "uuid", "p_period_id" "uuid", "p_amount" numeric, "p_reason" "text", "p_adjustment_type" "text", "p_source_invoice_id" "uuid", "p_source_credit_invoice_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text", "p_registered_at" timestamp with time zone, "p_expires_at" timestamp with time zone, "p_auto_renew" boolean, "p_locked" boolean, "p_nameservers" "text"[], "p_registrant" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text", "p_registered_at" timestamp with time zone, "p_expires_at" timestamp with time zone, "p_auto_renew" boolean, "p_locked" boolean, "p_nameservers" "text"[], "p_registrant" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text", "p_registered_at" timestamp with time zone, "p_expires_at" timestamp with time zone, "p_auto_renew" boolean, "p_locked" boolean, "p_nameservers" "text"[], "p_registrant" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_manual_domain"("p_customer_id" "uuid", "p_name" "text", "p_status" "text", "p_registered_at" timestamp with time zone, "p_expires_at" timestamp with time zone, "p_auto_renew" boolean, "p_locked" boolean, "p_nameservers" "text"[], "p_registrant" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."current_open_commission_period"("p_user_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."current_open_commission_period"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."current_open_commission_period"("p_user_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."get_commission_period_figures"("p_period_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."get_commission_period_figures"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_commission_period_figures"("p_period_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."has_permission"("perm" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."has_permission"("perm" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."has_permission"("perm" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_profile"("p_is_active" boolean, "p_account_status" "text", "p_start" "date", "p_end" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_profile"("p_is_active" boolean, "p_account_status" "text", "p_start" "date", "p_end" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_profile"("p_is_active" boolean, "p_account_status" "text", "p_start" "date", "p_end" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."is_active_user"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_active_user"() TO "service_role";



GRANT ALL ON FUNCTION "public"."is_admin"() TO "anon";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_admin"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."is_portal_customer_of"("p_customer_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_audit"("p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text", "p_user_agent" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text", "p_user_agent" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text", "p_user_agent" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_customer_view"("p_customer_id" "uuid", "p_action" "text", "p_ip" "text", "p_user_agent" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."log_security_event"("p_actor_user_id" "uuid", "p_action" "text", "p_target_type" "text", "p_target_id" "text", "p_target_label" "text", "p_before" "jsonb", "p_after" "jsonb", "p_ip" "text", "p_user_agent" "text", "p_outcome" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."mark_commission_period_paid"("p_period_id" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."mark_commission_period_paid"("p_period_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."mark_commission_period_paid"("p_period_id" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_commission_period"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_commission_period"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_commission_period"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_commission_period"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_customer_columns"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_customer_columns"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_customer_columns"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_customer_columns"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_invoice_salesperson"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_invoice_salesperson"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_invoice_salesperson"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_invoice_salesperson"() TO "service_role";



GRANT ALL ON FUNCTION "public"."protect_profiles"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_profiles"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_profiles"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_quote_fields"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_quote_fields"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_quote_fields"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_quote_fields"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."protect_quote_insert"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."protect_quote_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."protect_quote_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."protect_quote_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."quote_item_total"() TO "anon";
GRANT ALL ON FUNCTION "public"."quote_item_total"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."quote_item_total"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."quote_items_recalc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."quote_items_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."quote_items_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."quote_items_recalc"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."quotes_vat_recalc"() FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."quotes_vat_recalc"() TO "anon";
GRANT ALL ON FUNCTION "public"."quotes_vat_recalc"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."quotes_vat_recalc"() TO "service_role";



REVOKE ALL ON FUNCTION "public"."recalc_quote_totals"("p_quote" "uuid") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."recalc_quote_totals"("p_quote" "uuid") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_call_outcome"("p_session_id" "uuid", "p_customer_id" "uuid", "p_active_call_id" "uuid", "p_outcome" "text", "p_request_id" "uuid", "p_note" "text", "p_reminder_date" "text", "p_reminder_time" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_call_outcome"("p_session_id" "uuid", "p_customer_id" "uuid", "p_active_call_id" "uuid", "p_outcome" "text", "p_request_id" "uuid", "p_note" "text", "p_reminder_date" "text", "p_reminder_time" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_call_outcome"("p_session_id" "uuid", "p_customer_id" "uuid", "p_active_call_id" "uuid", "p_outcome" "text", "p_request_id" "uuid", "p_note" "text", "p_reminder_date" "text", "p_reminder_time" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."record_commission_payment"("p_salesperson_user_id" "uuid", "p_customer_id" "uuid", "p_amount_ex_vat" numeric, "p_paid_date" "date", "p_note" "text") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."record_commission_payment"("p_salesperson_user_id" "uuid", "p_customer_id" "uuid", "p_amount_ex_vat" numeric, "p_paid_date" "date", "p_note" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."record_commission_payment"("p_salesperson_user_id" "uuid", "p_customer_id" "uuid", "p_amount_ex_vat" numeric, "p_paid_date" "date", "p_note" "text") TO "service_role";



REVOKE ALL ON FUNCTION "public"."redact"("p" "jsonb") FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."redact"("p" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."redact"("p" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."redact"("p" "jsonb") TO "service_role";



REVOKE ALL ON FUNCTION "public"."set_user_permissions"("p_user" "uuid", "p_perms" "text"[]) FROM PUBLIC;
GRANT ALL ON FUNCTION "public"."set_user_permissions"("p_user" "uuid", "p_perms" "text"[]) TO "authenticated";
GRANT ALL ON FUNCTION "public"."set_user_permissions"("p_user" "uuid", "p_perms" "text"[]) TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_email_on_preferences_insert"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_email_on_preferences_insert"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_email_on_preferences_insert"() TO "service_role";



GRANT ALL ON FUNCTION "public"."sync_user_email_to_preferences"() TO "anon";
GRANT ALL ON FUNCTION "public"."sync_user_email_to_preferences"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."sync_user_email_to_preferences"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."attachments" TO "anon";
GRANT ALL ON TABLE "public"."attachments" TO "authenticated";
GRANT ALL ON TABLE "public"."attachments" TO "service_role";



GRANT ALL ON TABLE "public"."audit_log" TO "anon";
GRANT ALL ON TABLE "public"."audit_log" TO "authenticated";
GRANT ALL ON TABLE "public"."audit_log" TO "service_role";



GRANT ALL ON TABLE "public"."call_sessions" TO "anon";
GRANT ALL ON TABLE "public"."call_sessions" TO "authenticated";
GRANT ALL ON TABLE "public"."call_sessions" TO "service_role";



GRANT ALL ON TABLE "public"."code_snippets" TO "anon";
GRANT ALL ON TABLE "public"."code_snippets" TO "authenticated";
GRANT ALL ON TABLE "public"."code_snippets" TO "service_role";



GRANT ALL ON TABLE "public"."commission_adjustments" TO "anon";
GRANT ALL ON TABLE "public"."commission_adjustments" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_adjustments" TO "service_role";



GRANT ALL ON TABLE "public"."commission_entries" TO "anon";
GRANT ALL ON TABLE "public"."commission_entries" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_entries" TO "service_role";



GRANT ALL ON TABLE "public"."commission_periods" TO "anon";
GRANT ALL ON TABLE "public"."commission_periods" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_periods" TO "service_role";



GRANT ALL ON TABLE "public"."commission_tiers" TO "anon";
GRANT ALL ON TABLE "public"."commission_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."commission_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."company_settings" TO "anon";
GRANT ALL ON TABLE "public"."company_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."company_settings" TO "service_role";



GRANT ALL ON TABLE "public"."contact_messages" TO "anon";
GRANT ALL ON TABLE "public"."contact_messages" TO "authenticated";
GRANT ALL ON TABLE "public"."contact_messages" TO "service_role";



GRANT ALL ON TABLE "public"."customer_interactions" TO "anon";
GRANT ALL ON TABLE "public"."customer_interactions" TO "authenticated";
GRANT ALL ON TABLE "public"."customer_interactions" TO "service_role";



GRANT ALL ON TABLE "public"."customers" TO "anon";
GRANT ALL ON TABLE "public"."customers" TO "authenticated";
GRANT ALL ON TABLE "public"."customers" TO "service_role";



GRANT ALL ON TABLE "public"."domain_registrants" TO "anon";
GRANT ALL ON TABLE "public"."domain_registrants" TO "authenticated";
GRANT ALL ON TABLE "public"."domain_registrants" TO "service_role";



GRANT ALL ON TABLE "public"."domains" TO "anon";
GRANT ALL ON TABLE "public"."domains" TO "authenticated";
GRANT ALL ON TABLE "public"."domains" TO "service_role";



GRANT ALL ON TABLE "public"."emails" TO "anon";
GRANT ALL ON TABLE "public"."emails" TO "authenticated";
GRANT ALL ON TABLE "public"."emails" TO "service_role";



GRANT ALL ON TABLE "public"."invoices" TO "anon";
GRANT ALL ON TABLE "public"."invoices" TO "authenticated";
GRANT ALL ON TABLE "public"."invoices" TO "service_role";



GRANT ALL ON SEQUENCE "public"."invoices_invoice_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."invoices_invoice_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."invoices_invoice_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."lead_import_batches" TO "anon";
GRANT ALL ON TABLE "public"."lead_import_batches" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_import_batches" TO "service_role";



GRANT ALL ON TABLE "public"."lead_inbox" TO "authenticated";
GRANT ALL ON TABLE "public"."lead_inbox" TO "service_role";



GRANT ALL ON TABLE "public"."page_views" TO "anon";
GRANT ALL ON TABLE "public"."page_views" TO "authenticated";
GRANT ALL ON TABLE "public"."page_views" TO "service_role";



GRANT ALL ON TABLE "public"."profiles" TO "anon";
GRANT ALL ON TABLE "public"."profiles" TO "authenticated";
GRANT ALL ON TABLE "public"."profiles" TO "service_role";



GRANT ALL ON TABLE "public"."purchases" TO "anon";
GRANT ALL ON TABLE "public"."purchases" TO "authenticated";
GRANT ALL ON TABLE "public"."purchases" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaire_responses" TO "anon";
GRANT ALL ON TABLE "public"."questionnaire_responses" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaire_responses" TO "service_role";



GRANT ALL ON TABLE "public"."questionnaires" TO "anon";
GRANT ALL ON TABLE "public"."questionnaires" TO "authenticated";
GRANT ALL ON TABLE "public"."questionnaires" TO "service_role";



GRANT ALL ON TABLE "public"."quote_items" TO "anon";
GRANT ALL ON TABLE "public"."quote_items" TO "authenticated";
GRANT ALL ON TABLE "public"."quote_items" TO "service_role";



GRANT ALL ON TABLE "public"."quotes" TO "anon";
GRANT ALL ON TABLE "public"."quotes" TO "authenticated";
GRANT ALL ON TABLE "public"."quotes" TO "service_role";



GRANT ALL ON SEQUENCE "public"."quotes_quote_number_seq" TO "anon";
GRANT ALL ON SEQUENCE "public"."quotes_quote_number_seq" TO "authenticated";
GRANT ALL ON SEQUENCE "public"."quotes_quote_number_seq" TO "service_role";



GRANT ALL ON TABLE "public"."reminders" TO "anon";
GRANT ALL ON TABLE "public"."reminders" TO "authenticated";
GRANT ALL ON TABLE "public"."reminders" TO "service_role";



GRANT ALL ON TABLE "public"."salesperson_commission_settings" TO "anon";
GRANT ALL ON TABLE "public"."salesperson_commission_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."salesperson_commission_settings" TO "service_role";



GRANT ALL ON TABLE "public"."salesperson_commission_tiers" TO "anon";
GRANT ALL ON TABLE "public"."salesperson_commission_tiers" TO "authenticated";
GRANT ALL ON TABLE "public"."salesperson_commission_tiers" TO "service_role";



GRANT ALL ON TABLE "public"."user_permissions" TO "anon";
GRANT ALL ON TABLE "public"."user_permissions" TO "authenticated";
GRANT ALL ON TABLE "public"."user_permissions" TO "service_role";



GRANT ALL ON TABLE "public"."user_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_preferences" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























-- psql unrestrict directive removed for migration compatibility

RESET ALL;

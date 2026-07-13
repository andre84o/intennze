-- ════════════════════════════════════════════════════════════════════════════
-- lead_inbox · Admin-only inbox for PUBLIC leads (contact form + Facebook).
-- Public server routes insert via service_role. Staff have NO access. An Admin
-- reviews and assigns each lead to a Staff/Admin; only then is a customer
-- created (owner = chosen staff, created_by = the assigning admin). Assignment
-- is atomic and audit-logged via public.log_audit(). Admins ARCHIVE (status),
-- never DELETE (no delete policy).
-- Depends on Release A (profiles, is_admin, is_active_profile, log_audit).
-- ════════════════════════════════════════════════════════════════════════════

create table if not exists public.lead_inbox (
  id           uuid primary key default gen_random_uuid(),
  created_at   timestamptz not null default now(),
  source       text not null check (source in ('contact_form','facebook')),
  external_id  text,                                   -- facebook: leadgen_id; contact: null
  status       text not null default 'new' check (status in ('new','assigned','archived')),
  -- lead payload (varies by source; nullable)
  name         text,
  email        text,
  phone        text,
  company      text,
  message      text,
  raw          jsonb,                                  -- sanitized original payload (NEVER tokens/secrets)
  -- assignment (filled only when status = 'assigned')
  assigned_to  uuid references public.profiles(user_id) on delete restrict,
  assigned_by  uuid references public.profiles(user_id) on delete restrict,
  assigned_at  timestamptz,
  customer_id  uuid references public.customers(id),
  is_read      boolean not null default false,
  -- status/field invariants
  constraint lead_inbox_status_fields check (
    case status
      when 'new'      then assigned_to is null and assigned_by is null and assigned_at is null and customer_id is null
      when 'assigned' then assigned_to is not null and assigned_by is not null and assigned_at is not null and customer_id is not null
      else true
    end
  )
);

create index if not exists idx_lead_inbox_status  on public.lead_inbox(status);
create index if not exists idx_lead_inbox_created on public.lead_inbox(created_at desc);
-- idempotent dedup for external sources (facebook leadgen_id); contact leads (null) are exempt
create unique index if not exists lead_inbox_source_external_id_unique
  on public.lead_inbox(source, external_id)
  where external_id is not null;

-- ── grants: authenticated (RLS restricts to admin), service_role writes, anon none
grant select, update on public.lead_inbox to authenticated;
grant select, insert, update, delete on public.lead_inbox to service_role;
revoke all on public.lead_inbox from anon;

-- ── RLS: admin-only SELECT + UPDATE. No INSERT policy (service_role bypasses).
--        No DELETE policy (archive via status). Staff get nothing.
alter table public.lead_inbox enable row level security;
drop policy if exists lead_inbox_select on public.lead_inbox;
drop policy if exists lead_inbox_update on public.lead_inbox;
create policy lead_inbox_select on public.lead_inbox
  for select to authenticated using (public.is_admin());
create policy lead_inbox_update on public.lead_inbox
  for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- assign_lead · atomic, admin-only assignment. Creates a customer owned by the
-- chosen staff (created_by = the assigning admin), flips the lead to 'assigned',
-- and audit-logs via public.log_audit(). Admin edits first/last name in the UI
-- before calling; other customer fields are prefilled from the lead.
-- ════════════════════════════════════════════════════════════════════════════
create or replace function public.assign_lead(
  p_lead uuid, p_staff uuid, p_first_name text, p_last_name text
) returns uuid
  language plpgsql security definer set search_path = '' as $$
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

revoke execute on function public.assign_lead(uuid, uuid, text, text) from public, anon;
grant execute on function public.assign_lead(uuid, uuid, text, text) to authenticated;

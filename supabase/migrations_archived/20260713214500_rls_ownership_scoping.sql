-- ════════════════════════════════════════════════════════════════════════════
-- RELEASE B · Backfill (deterministic) · RLS · triggers · protections
-- Admin-independent so it applies cleanly without a marked admin.
-- Orphan-owner adoption (needs an admin) is a SEPARATE manual step (see
-- supabase/manual/backfill_owner.sql) run after the admin bootstrap.
-- ════════════════════════════════════════════════════════════════════════════

-- ── HARD PRECONDITION: exactly one active admin must exist ───────────────────
-- Aborts Release B unless a single active admin has been bootstrapped and
-- verified (see supabase/manual/verify_admin.sql). Uses public.is_active_profile
-- (is_active, account_status, employment_start, employment_end) from Release A.
do $$
declare n int;
begin
  select count(*) into n from public.profiles p
  where p.role = 'admin'
    and public.is_active_profile(p.is_active, p.account_status, p.employment_start, p.employment_end);
  if n <> 1 then
    raise exception 'Aborting Release B: expected exactly 1 active admin, found %. Bootstrap and verify the admin before applying Release B.', n;
  end if;
end $$;

-- ── deterministic owner backfill from existing created_by only ───────────────
update public.customers set owner_user_id = created_by
  where owner_user_id is null and created_by is not null;
update public.quotes set owner_user_id = created_by
  where owner_user_id is null and created_by is not null;

-- ════════════════════════════════════════════════════════════════════════════
-- Triggers / protections
-- ════════════════════════════════════════════════════════════════════════════

-- customers: only admin may change owner/created_by/archived_at (on UPDATE)
create or replace function public.protect_customer_columns() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() and (
       new.owner_user_id is distinct from old.owner_user_id
    or new.created_by   is distinct from old.created_by
    or new.archived_at  is distinct from old.archived_at) then
    raise exception 'Only an admin can change ownership or archive state.';
  end if;
  return new;
end $$;
revoke execute on function public.protect_customer_columns() from public;

-- quotes INSERT: staff quotes forced clean, self-owned, on an OWN customer
create or replace function public.protect_quote_insert() returns trigger
  language plpgsql security definer set search_path = '' as $$
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
revoke execute on function public.protect_quote_insert() from public;

-- quotes UPDATE: WHITELIST of staff-editable fields; only while status='draft'.
-- Staff may edit ONLY: customer_id (own), title, description, valid_from,
-- valid_until, notes, terms. Every other column must be unchanged.
create or replace function public.protect_quote_fields() returns trigger
  language plpgsql security definer set search_path = '' as $$
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
revoke execute on function public.protect_quote_fields() from public;

-- quote_items.total is ALWAYS derived from quantity * unit_price (corr. 10)
create or replace function public.quote_item_total() returns trigger
  language plpgsql set search_path = '' as $$
begin
  new.total := round(coalesce(new.quantity, 0) * coalesce(new.unit_price, 0), 2);
  return new;
end $$;
drop trigger if exists trg_quote_item_total on public.quote_items;
create trigger trg_quote_item_total before insert or update on public.quote_items
  for each row execute function public.quote_item_total();

-- DB-derived quote totals; not user-callable (corr. 12)
create or replace function public.recalc_quote_totals(p_quote uuid) returns void
  language plpgsql security definer set search_path = '' as $$
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
revoke execute on function public.recalc_quote_totals(uuid) from public;
revoke execute on function public.recalc_quote_totals(uuid) from anon;
revoke execute on function public.recalc_quote_totals(uuid) from authenticated;

-- recompute BOTH old and new quote when quote_id changes (corr. 11)
create or replace function public.quote_items_recalc() returns trigger
  language plpgsql security definer set search_path = '' as $$
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
revoke execute on function public.quote_items_recalc() from public;
drop trigger if exists trg_quote_items_recalc on public.quote_items;
create trigger trg_quote_items_recalc after insert or update or delete on public.quote_items
  for each row execute function public.quote_items_recalc();

create or replace function public.quotes_vat_recalc() returns trigger
  language plpgsql security definer set search_path = '' as $$
begin
  if new.vat_rate is distinct from old.vat_rate then
    perform public.recalc_quote_totals(new.id);
  end if;
  return null;
end $$;
revoke execute on function public.quotes_vat_recalc() from public;
drop trigger if exists trg_quotes_vat_recalc on public.quotes;
create trigger trg_quotes_vat_recalc after update on public.quotes
  for each row execute function public.quotes_vat_recalc();

-- ════════════════════════════════════════════════════════════════════════════
-- RLS : drop ONLY the explicitly-named legacy policies, then ABORT if unknown
-- policies remain (never touch future/unknown policies) — corr. 15 applies to
-- rollback; here we still enumerate + guard.
-- ════════════════════════════════════════════════════════════════════════════
drop policy if exists "Allow authenticated users to read customers"   on public.customers;
drop policy if exists "Allow authenticated users to insert customers" on public.customers;
drop policy if exists "Allow authenticated users to update customers" on public.customers;
drop policy if exists "Allow authenticated users to delete customers" on public.customers;
drop policy if exists "Allow anonymous to read customer via questionnaire" on public.customers;

drop policy if exists "Allow authenticated users to read quotes"   on public.quotes;
drop policy if exists "Allow authenticated users to insert quotes" on public.quotes;
drop policy if exists "Allow authenticated users to update quotes" on public.quotes;
drop policy if exists "Allow authenticated users to delete quotes" on public.quotes;
drop policy if exists "authenticated_read_quotes" on public.quotes;
drop policy if exists "authenticated_insert_quotes" on public.quotes;
drop policy if exists "authenticated_update_quotes" on public.quotes;
drop policy if exists "authenticated_delete_quotes" on public.quotes;

drop policy if exists "Allow authenticated users to read quote_items"   on public.quote_items;
drop policy if exists "Allow authenticated users to insert quote_items" on public.quote_items;
drop policy if exists "Allow authenticated users to update quote_items" on public.quote_items;
drop policy if exists "Allow authenticated users to delete quote_items" on public.quote_items;
drop policy if exists "authenticated_read_quote_items" on public.quote_items;
drop policy if exists "authenticated_insert_quote_items" on public.quote_items;
drop policy if exists "authenticated_update_quote_items" on public.quote_items;
drop policy if exists "authenticated_delete_quote_items" on public.quote_items;

drop policy if exists "Allow authenticated users to read reminders"   on public.reminders;
drop policy if exists "Allow authenticated users to insert reminders" on public.reminders;
drop policy if exists "Allow authenticated users to update reminders" on public.reminders;
drop policy if exists "Allow authenticated users to delete reminders" on public.reminders;

drop policy if exists "Allow authenticated users to read interactions"   on public.customer_interactions;
drop policy if exists "Allow authenticated users to insert interactions" on public.customer_interactions;
drop policy if exists "Allow authenticated users to update interactions" on public.customer_interactions;
drop policy if exists "Allow authenticated users to delete interactions" on public.customer_interactions;

drop policy if exists "Allow authenticated users to read purchases"   on public.purchases;
drop policy if exists "Allow authenticated users to insert purchases" on public.purchases;
drop policy if exists "Allow authenticated users to update purchases" on public.purchases;
drop policy if exists "Allow authenticated users to delete purchases" on public.purchases;

drop policy if exists "Allow authenticated users to read emails"   on public.emails;
drop policy if exists "Allow authenticated users to insert emails" on public.emails;
drop policy if exists "Allow authenticated users to update emails" on public.emails;
drop policy if exists "Allow authenticated users to delete emails" on public.emails;

do $$
declare r record; leftover text := '';
begin
  for r in select tablename, policyname from pg_policies where schemaname = 'public'
    and tablename in ('customers','quotes','quote_items','reminders',
                      'customer_interactions','purchases','emails')
  loop
    leftover := leftover || format('%s.%L; ', r.tablename, r.policyname);
  end loop;
  if leftover <> '' then
    raise exception 'Aborting: unexpected policies present (manual review, nothing dropped blindly): %', leftover;
  end if;
end $$;

-- ── CUSTOMERS ────────────────────────────────────────────────────────────────
-- UPDATE no longer requires created_by = self (admin may assign an admin-created
-- customer to a staff owner who then edits it) — corr. 6.
create policy customers_select on public.customers for select to authenticated using (
  public.is_admin() or (archived_at is null
    and owner_user_id = (select auth.uid()) and public.has_permission('customers.view_own')));
create policy customers_insert on public.customers for insert to authenticated with check (
  public.is_admin() or (owner_user_id = (select auth.uid()) and created_by = (select auth.uid())
    and archived_at is null and public.has_permission('customers.create')));
create policy customers_update on public.customers for update to authenticated
  using (public.is_admin() or (archived_at is null
    and owner_user_id = (select auth.uid()) and public.has_permission('customers.update_own')))
  with check (public.is_admin() or owner_user_id = (select auth.uid()));
create trigger trg_customers_protect before update on public.customers
  for each row execute function public.protect_customer_columns();

-- ── QUOTES ───────────────────────────────────────────────────────────────────
-- customer-ownership enforced on insert (corr. 7) and on customer_id change (corr. 8)
create policy quotes_select on public.quotes for select to authenticated using (
  public.is_admin() or (archived_at is null
    and owner_user_id = (select auth.uid()) and public.has_permission('quotes.view_own')));
create policy quotes_insert on public.quotes for insert to authenticated with check (
  public.is_admin() or (owner_user_id = (select auth.uid()) and created_by = (select auth.uid())
    and public.has_permission('quotes.create')
    and exists (select 1 from public.customers c
      where c.id = quotes.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy quotes_update on public.quotes for update to authenticated
  using (public.is_admin() or (archived_at is null
    and owner_user_id = (select auth.uid()) and public.has_permission('quotes.update_own')))
  with check (public.is_admin() or (owner_user_id = (select auth.uid())
    and (customer_id is null or exists (select 1 from public.customers c
      where c.id = quotes.customer_id and c.owner_user_id = (select auth.uid())))));
create trigger trg_protect_quote_insert before insert on public.quotes
  for each row execute function public.protect_quote_insert();
create trigger trg_protect_quote_fields before update on public.quotes
  for each row execute function public.protect_quote_fields();

-- ── QUOTE_ITEMS (via parent quote owner + draft + not archived + permission) ──
create policy quote_items_select on public.quote_items for select to authenticated using (
  public.is_admin() or exists (select 1 from public.quotes q where q.id = quote_items.quote_id
    and q.owner_user_id = (select auth.uid()) and q.archived_at is null and public.has_permission('quotes.view_own')));
create policy quote_items_insert on public.quote_items for insert to authenticated with check (
  quote_items.archived_at is null and (public.is_admin() or exists (select 1 from public.quotes q
    where q.id = quote_items.quote_id and q.owner_user_id = (select auth.uid())
      and q.archived_at is null and q.status = 'draft' and public.has_permission('quotes.create'))));
create policy quote_items_update on public.quote_items for update to authenticated using (
  public.is_admin() or exists (select 1 from public.quotes q where q.id = quote_items.quote_id
    and q.owner_user_id = (select auth.uid()) and q.archived_at is null and q.status = 'draft'
    and public.has_permission('quotes.update_own')));

-- ── REMINDERS (all staff branches require manage_own + active) — corr. 1 & 14 ─
create policy reminders_select on public.reminders for select to authenticated using (
  public.is_admin() or (public.has_permission('reminders.manage_own') and exists (
    select 1 from public.customers c where c.id = reminders.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy reminders_insert on public.reminders for insert to authenticated with check (
  public.is_admin() or (public.has_permission('reminders.manage_own') and exists (
    select 1 from public.customers c where c.id = reminders.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy reminders_update on public.reminders for update to authenticated using (
  public.is_admin() or (public.has_permission('reminders.manage_own') and exists (
    select 1 from public.customers c where c.id = reminders.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy reminders_delete on public.reminders for delete to authenticated using (
  public.is_admin() or (public.has_permission('reminders.manage_own') and exists (
    select 1 from public.customers c where c.id = reminders.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));

-- ── CUSTOMER_INTERACTIONS (append-only for staff; active-gated) ──────────────
create policy interactions_select on public.customer_interactions for select to authenticated using (
  public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.customers c where c.id = customer_interactions.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy interactions_insert on public.customer_interactions for insert to authenticated with check (
  public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.customers c where c.id = customer_interactions.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy interactions_update on public.customer_interactions for update to authenticated
  using (public.is_admin());
-- no DELETE policy

-- ── PURCHASES (admin-only financial history) ─────────────────────────────────
create policy purchases_select on public.purchases for select to authenticated using (public.is_admin());
create policy purchases_insert on public.purchases for insert to authenticated with check (public.is_admin());
create policy purchases_update on public.purchases for update to authenticated using (public.is_admin());
-- no DELETE policy

-- ── EMAILS (active-gated; insert requires emails.send + own customer; no edit of sent mail) ──
create policy emails_select on public.emails for select to authenticated using (
  public.is_admin() or (public.is_active_user() and (emails.sent_by = (select auth.uid())
    or exists (select 1 from public.customers c where c.id = emails.customer_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null))));
create policy emails_insert on public.emails for insert to authenticated with check (
  public.is_admin() or (emails.sent_by = (select auth.uid()) and public.has_permission('emails.send')
    and (emails.customer_id is null or exists (select 1 from public.customers c
      where c.id = emails.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null))));
create policy emails_update on public.emails for update to authenticated using (public.is_admin());
-- no DELETE policy

-- ════════════════════════════════════════════════════════════════════════════
-- Untracked tables (from live dump) + attachments + Storage — owner-scoped RLS
-- ════════════════════════════════════════════════════════════════════════════

-- ── INVOICES (read scoped by customer owner; writes admin-only => staff cannot
--    change payment status) ─────────────────────────────────────────────────
drop policy if exists "Authenticated users can select invoices" on public.invoices;
drop policy if exists "Authenticated users can insert invoices" on public.invoices;
drop policy if exists "Authenticated users can update invoices" on public.invoices;
drop policy if exists "Authenticated users can delete invoices" on public.invoices;
drop policy if exists "Authenticated users can manage invoices" on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (
  public.is_admin() or (public.is_active_user() and exists (select 1 from public.customers c
    where c.id = invoices.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy invoices_insert on public.invoices for insert to authenticated with check (public.is_admin());
create policy invoices_update on public.invoices for update to authenticated using (public.is_admin());
create policy invoices_delete on public.invoices for delete to authenticated using (public.is_admin());

-- ── QUESTIONNAIRES (scoped by customer owner; public flows use service role) ─
drop policy if exists "Allow authenticated users to select questionnaires" on public.questionnaires;
drop policy if exists "Allow authenticated users to insert questionnaires" on public.questionnaires;
drop policy if exists "Allow authenticated users to update questionnaires" on public.questionnaires;
drop policy if exists "Allow authenticated users to delete questionnaires" on public.questionnaires;
create policy questionnaires_select on public.questionnaires for select to authenticated using (
  public.is_admin() or (public.is_active_user() and exists (select 1 from public.customers c
    where c.id = questionnaires.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy questionnaires_insert on public.questionnaires for insert to authenticated with check (
  public.is_admin() or (public.is_active_user() and exists (select 1 from public.customers c
    where c.id = questionnaires.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy questionnaires_update on public.questionnaires for update to authenticated using (
  public.is_admin() or (public.is_active_user() and exists (select 1 from public.customers c
    where c.id = questionnaires.customer_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy questionnaires_delete on public.questionnaires for delete to authenticated using (public.is_admin());

-- ── QUESTIONNAIRE_RESPONSES (scoped via questionnaire->customer owner) ────────
drop policy if exists "Allow authenticated users to select questionnaire_responses" on public.questionnaire_responses;
drop policy if exists "Allow authenticated users to insert questionnaire_responses" on public.questionnaire_responses;
drop policy if exists "Allow authenticated users to update questionnaire_responses" on public.questionnaire_responses;
drop policy if exists "Allow authenticated users to delete questionnaire_responses" on public.questionnaire_responses;
create policy qr_select on public.questionnaire_responses for select to authenticated using (
  public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.questionnaires q join public.customers c on c.id = q.customer_id
    where q.id = questionnaire_responses.questionnaire_id
      and c.owner_user_id = (select auth.uid()) and c.archived_at is null)));
create policy qr_insert on public.questionnaire_responses for insert to authenticated with check (public.is_admin());
create policy qr_update on public.questionnaire_responses for update to authenticated using (public.is_admin());
create policy qr_delete on public.questionnaire_responses for delete to authenticated using (public.is_admin());

-- ── CONTACT_MESSAGES (admin-only; keep public anon insert) ───────────────────
drop policy if exists "Allow authenticated users to read contact_messages"   on public.contact_messages;
drop policy if exists "Allow authenticated users to update contact_messages" on public.contact_messages;
drop policy if exists "Allow authenticated users to delete contact_messages" on public.contact_messages;
create policy contact_select on public.contact_messages for select to authenticated using (public.is_admin());
create policy contact_update on public.contact_messages for update to authenticated using (public.is_admin());
create policy contact_delete on public.contact_messages for delete to authenticated using (public.is_admin());
-- "Allow anonymous to insert contact_messages" is intentionally left untouched.

-- ── ATTACHMENTS (owner-scoped by created_by / parent entity; delete admin-only) ─
drop policy if exists "Authenticated can read attachments"   on public.attachments;
drop policy if exists "Authenticated can insert attachments" on public.attachments;
drop policy if exists "Authenticated can update attachments" on public.attachments;
drop policy if exists "Authenticated can delete attachments" on public.attachments;
-- Staff access is granted ONLY through an owned customer/quote parent entity.
-- Other entity_types (e.g. 'code_snippet') are admin-only — prior "shared"
-- behaviour is NOT inherited (no created_by catch-all).
create policy attachments_select on public.attachments for select to authenticated using (
  public.is_admin() or (public.is_active_user() and (
    (entity_type = 'customer' and exists (select 1 from public.customers c
      where c.id = attachments.entity_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null))
    or (entity_type = 'quote' and exists (select 1 from public.quotes q
      where q.id = attachments.entity_id and q.owner_user_id = (select auth.uid()) and q.archived_at is null)))));
create policy attachments_insert on public.attachments for insert to authenticated with check (
  public.is_admin() or (public.has_permission('attachments.upload') and created_by = (select auth.uid())
    and ((entity_type = 'customer' and exists (select 1 from public.customers c
        where c.id = attachments.entity_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null))
      or (entity_type = 'quote' and exists (select 1 from public.quotes q
        where q.id = attachments.entity_id and q.owner_user_id = (select auth.uid()) and q.archived_at is null)))));
create policy attachments_update on public.attachments for update to authenticated using (public.is_admin());
create policy attachments_delete on public.attachments for delete to authenticated using (public.is_admin());

-- ── STORAGE (bucket 'attachments'): scope reads by the attachment's ownership;
--    upload requires attachments.upload; delete admin-only ─────────────────────
drop policy if exists "Authenticated can upload attachments storage" on storage.objects;
drop policy if exists "Authenticated can read attachments storage"   on storage.objects;
drop policy if exists "Authenticated can delete attachments storage" on storage.objects;
create policy attachments_storage_insert on storage.objects for insert to authenticated with check (
  bucket_id = 'attachments' and (public.is_admin() or public.has_permission('attachments.upload')));
create policy attachments_storage_select on storage.objects for select to authenticated using (
  bucket_id = 'attachments' and (public.is_admin() or (public.is_active_user() and exists (
    select 1 from public.attachments a where a.storage_path = storage.objects.name and (
      (a.entity_type = 'customer' and exists (select 1 from public.customers c
        where c.id = a.entity_id and c.owner_user_id = (select auth.uid()) and c.archived_at is null))
      or (a.entity_type = 'quote' and exists (select 1 from public.quotes q
        where q.id = a.entity_id and q.owner_user_id = (select auth.uid()) and q.archived_at is null)))))));
create policy attachments_storage_delete on storage.objects for delete to authenticated using (
  bucket_id = 'attachments' and public.is_admin());

-- ════════════════════════════════════════════════════════════════════════════
-- Security hardening · contact_messages lockdown + input length limits
-- (additive, idempotent forward migration)
--
-- Background: the baseline granted the public `anon` role a WITH CHECK
-- (id IS NOT NULL) INSERT policy plus GRANT ALL on public.contact_messages.
-- Because `id` defaults to gen_random_uuid(), that check is always true, so
-- anyone holding the browser-exposed anon key could insert unlimited arbitrary
-- rows straight into the table — bypassing /api/contact's validation and rate
-- limiting (a spam / storage-flooding vector). Contact submissions are written
-- server-side only, via /api/contact using the service-role key, so the public
-- write path is unused and unsafe.
--
-- This migration:
--   1. Removes the public anon INSERT policy on contact_messages.
--   2. Revokes ALL table privileges on contact_messages from anon (and the
--      matching public.page_views-style exposure is intentionally left alone —
--      only contact_messages is in scope here).
--   3. Adds length CHECK constraints (NOT VALID, so existing rows are untouched
--      but every new insert/update is bounded) on contact_messages AND on
--      lead_inbox — lead_inbox is the live target of /api/contact.
--   4. Stops future tables created by `postgres` in schema public from being
--      auto-granted ALL to anon (default-privilege tightening). Existing tables
--      and their grants are NOT affected; existing functions/sequences defaults
--      are left intact to avoid breaking RPC/sequence access.
--
-- After this migration NO public (anon) policy allows INSERT/UPDATE/SELECT/
-- DELETE on contact_messages. Only `authenticated` admins (gated by RLS
-- is_admin()) and `service_role` retain access. RLS stays enabled; no policy is
-- weakened and no USING(true) policy is introduced.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ── 1. Drop the public anon INSERT policy ────────────────────────────────────
drop policy if exists "Allow anonymous to insert contact_messages"
  on public.contact_messages;

-- ── 2. Revoke every anon privilege on the table ──────────────────────────────
-- Only server-side (service_role) and admin-gated authenticated access remain.
revoke all on table public.contact_messages from anon;

-- ── 3a. Bound contact_messages field lengths (NOT VALID: new writes only) ─────
alter table public.contact_messages
  drop constraint if exists contact_messages_name_len;
alter table public.contact_messages
  add constraint contact_messages_name_len
  check (char_length(name) <= 200) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_email_len;
alter table public.contact_messages
  add constraint contact_messages_email_len
  check (char_length(email) <= 320) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_phone_len;
alter table public.contact_messages
  add constraint contact_messages_phone_len
  check (phone is null or char_length(phone) <= 40) not valid;

alter table public.contact_messages
  drop constraint if exists contact_messages_message_len;
alter table public.contact_messages
  add constraint contact_messages_message_len
  check (char_length(message) <= 5000) not valid;

-- ── 3b. Bound lead_inbox field lengths (live /api/contact target) ────────────
-- All columns are nullable on lead_inbox, so each check tolerates NULL.
alter table public.lead_inbox
  drop constraint if exists lead_inbox_name_len;
alter table public.lead_inbox
  add constraint lead_inbox_name_len
  check (name is null or char_length(name) <= 200) not valid;

alter table public.lead_inbox
  drop constraint if exists lead_inbox_email_len;
alter table public.lead_inbox
  add constraint lead_inbox_email_len
  check (email is null or char_length(email) <= 320) not valid;

alter table public.lead_inbox
  drop constraint if exists lead_inbox_phone_len;
alter table public.lead_inbox
  add constraint lead_inbox_phone_len
  check (phone is null or char_length(phone) <= 40) not valid;

alter table public.lead_inbox
  drop constraint if exists lead_inbox_company_len;
alter table public.lead_inbox
  add constraint lead_inbox_company_len
  check (company is null or char_length(company) <= 200) not valid;

alter table public.lead_inbox
  drop constraint if exists lead_inbox_message_len;
alter table public.lead_inbox
  add constraint lead_inbox_message_len
  check (message is null or char_length(message) <= 5000) not valid;

-- ── 4. Tighten default privileges so future tables are not auto-open to anon ──
-- Affects ONLY tables created later by role postgres in schema public. Existing
-- tables keep their current grants; sequences/functions defaults are untouched.
alter default privileges for role postgres in schema public
  revoke all on tables from anon;

commit;

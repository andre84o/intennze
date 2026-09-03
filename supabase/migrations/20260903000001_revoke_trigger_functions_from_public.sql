-- ════════════════════════════════════════════════════════════════════════════
-- Security: revoke PUBLIC execute on trigger functions that retained a
-- public-grant after the previous migration (20260903000000).
--
-- Root cause: REVOKE FROM anon/authenticated does not remove a grant that was
-- made TO PUBLIC. These 8 functions still carried `=X/postgres` in proacl.
-- The remaining 6 trigger functions (protect_customer_columns etc.) had no
-- PUBLIC grant and were already clean.
--
-- Affected functions (proacl contained `=X/postgres` before this migration):
--   audit_domain_change, audit_domain_registrant_change,
--   audit_permission_change, audit_profile_change, audit_profile_insert,
--   protect_profiles, sync_email_on_preferences_insert,
--   sync_user_email_to_preferences
--
-- After this migration proacl will be:
--   {postgres=X/postgres, service_role=X/postgres}
-- i.e. only the function owner and service_role can execute them —
-- correct for functions that are only ever called by database triggers.
-- ════════════════════════════════════════════════════════════════════════════

begin;

revoke execute on function public.audit_domain_change()              from public;
revoke execute on function public.audit_domain_registrant_change()   from public;
revoke execute on function public.audit_permission_change()          from public;
revoke execute on function public.audit_profile_change()             from public;
revoke execute on function public.audit_profile_insert()             from public;
revoke execute on function public.protect_profiles()                 from public;
revoke execute on function public.sync_email_on_preferences_insert() from public;
revoke execute on function public.sync_user_email_to_preferences()   from public;

commit;

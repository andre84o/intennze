For UI design ideas, you may use shadcn/ui as visual inspiration:
https://ui.shadcn.com/

## Security rules

- Never trust the frontend for security. Auth and admin checks must happen server-side.
- Never expose secrets, service role keys, database URLs, tokens, cookies, or private API keys.
- Do not use `SUPABASE_SERVICE_ROLE_KEY` in client/frontend code.
- Protected API routes must verify the logged-in user before reading or writing data.
- Admin features must verify admin permission on the server, not only hide UI buttons.
- Validate all API inputs server-side. Use allowlists for status, role, type, and enum values.
- Never render user/customer content with `dangerouslySetInnerHTML` unless explicitly approved and sanitized.
- Do not create public endpoints that send emails, update data, or expose customer/lead data.
- Webhooks must verify provider signatures when supported.
- Do not weaken RLS policies or create broad `USING (true)` policies without explicit approval.
- Do not log passwords, tokens, reset links, auth headers, full emails, phone numbers, or sensitive customer data.
- Before changes touching auth, API routes, admin, Supabase, RLS, forms, webhooks, or customer data: explain the security impact first.
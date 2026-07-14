# Supabase Security Checklist — Disable Self-Registration (Production Auth Hardening)

> **Critical:** `supabase/config.toml` controls **local dev only** (`supabase start`).
> It does **not** affect the production/hosted Supabase project. The settings below
> must be verified and changed **manually in the production dashboard** (or via the
> Management API / service role — never from client code).

## Why this matters

This app uses a **permissive, single-tenant RLS model**: policies grant access to any
authenticated user (e.g. `auth.uid() IS NOT NULL`). That means **any account that can log
in has full read/write access to all customer, lead, invoice, and company data.**

The project's public **anon key** is shipped to the browser, and Supabase exposes a public
`/auth/v1/signup` endpoint. If self-registration is enabled, **anyone with the anon key can
create their own account and immediately gain full access to all data.** Therefore signup
**must be disabled** in production.

There is **no signup UI or signup route** in this app (login uses `signInWithPassword`
only). Disabling signup breaks nothing for legitimate users.

## Manual production changes (Supabase Dashboard)

1. **Authentication → Sign In / Providers**
   - Disable **"Allow new users to sign up"** (global signup toggle).
2. **Authentication → Sign In / Providers → Email** (provider settings)
   - Disable **"Enable email signup"**.
3. Repeat the equivalent "disable signup" toggle for **any other enabled provider**
   (OAuth, phone/SMS, anonymous). Verify nothing has been turned on that shouldn't be.

The equivalent Management API field is `disable_signup`. When self-signup is off it reads
`disable_signup = true`. Changing it is an intentional production action and should be done
knowingly (dashboard preferred).

## Order of operations (do NOT skip)

**Tighten RLS *before* you ever allow signup.** If signup must ever be enabled, the RLS
model must first move from `auth.uid() IS NOT NULL` to a per-owner or admin-allowlist model
(e.g. restrict to specific `auth.uid()` values or an `admins` table / JWT claim). Email
confirmation is **not** an access control — do not rely on it.

## Creating the legitimate admin account(s)

Because there is no signup UI, provision admin users one of these ways (never via public
signup):

- **Dashboard:** Authentication → Users → **Add user** → enter email + password, and
  (if email confirmations are off) mark the user as confirmed / "auto confirm".
- **Invite:** Authentication → Users → **Invite** (sends an invite email).
- **Service-role admin API** (server-side only, never in client code):

  ```bash
  curl -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/admin/users" \
    -H "apikey: <SERVICE_ROLE_KEY>" \
    -H "Authorization: Bearer <SERVICE_ROLE_KEY>" \
    -H "Content-Type: application/json" \
    -d '{"email":"<admin-email>","password":"<strong-password>","email_confirm":true}'
  ```

  > The service-role key bypasses RLS and must **never** be exposed to the frontend,
  > committed, or logged.

## Verification steps (confirm signup is actually off in prod)

Attempt a signup against the production endpoint using the **public anon key**. It should be
**rejected** (HTTP 4xx, e.g. "Signups not allowed for this instance").

```bash
curl -i -X POST "https://<PROJECT_REF>.supabase.co/auth/v1/signup" \
  -H "apikey: <ANON_KEY>" \
  -H "Content-Type: application/json" \
  -d '{"email":"test-should-fail@example.com","password":"Test123456!"}'
```

- **Expected (secure):** `400`/`422` with a message like
  `{"code":422,"msg":"Signups not allowed for this instance"}` and **no user created**.
- **If a user is created (insecure):** signup is still enabled — apply the dashboard steps
  above. If a test user was created, delete it under Authentication → Users.

You can also read (never write) the current state via the Management API:

```bash
# Requires a Management API access token (keep it out of logs, commits, and chat).
curl -s -H "Authorization: Bearer <MANAGEMENT_API_TOKEN>" \
  "https://api.supabase.com/v1/projects/<PROJECT_REF>/config/auth" | \
  grep -o '"disable_signup":[a-z]*'
```

- **Secure:** `"disable_signup":true`
- **Insecure:** `"disable_signup":false` — self-signup is open; disable it in the dashboard.

> Use placeholders only. Do **not** paste real project refs, anon keys, service-role keys, or
> Management API tokens into this file, commits, logs, or chat.

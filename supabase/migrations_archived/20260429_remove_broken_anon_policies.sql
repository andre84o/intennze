-- Phase 1 security fix — remove broken anon RLS policies on quotes/questionnaires.
--
-- The previous policies used `USING (public_token IS NOT NULL)` which let any
-- holder of the anon key SELECT/UPDATE every row that had a token, not just
-- their own. The fix: drop those policies entirely. Reads/writes for public
-- token flows now go through server-side routes/pages that use the service role
-- and an explicit `where public_token = $1` filter:
--
--   /offert/[token]/page.tsx           — SELECT (service role)
--   /formular/[token]/page.tsx         — SELECT (service role)
--   /api/questionnaire/opened/route.ts — UPDATE (service role)
--   /api/questionnaire/respond/route.ts— SELECT/UPDATE/INSERT (service role)
--   /api/quotes/respond/route.ts       — SELECT/UPDATE (service role)

-- ── quotes ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anonymous to read quotes by token" ON quotes;
DROP POLICY IF EXISTS "Allow anonymous to update quote response" ON quotes;

-- ── quote_items ───────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anonymous to read quote_items" ON quote_items;

-- ── questionnaires ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anonymous to read questionnaires by token" ON questionnaires;
DROP POLICY IF EXISTS "Allow anonymous to update questionnaire status" ON questionnaires;

-- ── questionnaire_responses ───────────────────────────────────────────────
-- Anon insert/select are unused: respond route uses service role.
DROP POLICY IF EXISTS "Allow anonymous to insert questionnaire responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Allow anonymous to read questionnaire responses" ON questionnaire_responses;

-- ── customers ─────────────────────────────────────────────────────────────
-- Anon read of customers (via questionnaire/quote token) is unused: the page
-- routes now fetch customer data server-side with the service role.
DROP POLICY IF EXISTS "Allow anonymous to read customer via questionnaire" ON customers;

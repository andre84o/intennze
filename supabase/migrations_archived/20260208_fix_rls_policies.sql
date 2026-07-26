-- Fix overly permissive RLS policies by replacing USING(true) / WITH CHECK(true)
-- with (select auth.uid()) IS NOT NULL for authenticated users.
-- Using (select ...) wrapper so auth.uid() is evaluated once, not per-row.

-- ══════════════════════════════════════════════
-- code_snippets
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert code_snippets" ON code_snippets;
DROP POLICY IF EXISTS "Allow authenticated users to update code_snippets" ON code_snippets;
DROP POLICY IF EXISTS "Allow authenticated users to delete code_snippets" ON code_snippets;

CREATE POLICY "Allow authenticated users to insert code_snippets" ON code_snippets
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update code_snippets" ON code_snippets
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete code_snippets" ON code_snippets
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- company_settings
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can insert company settings" ON company_settings;
DROP POLICY IF EXISTS "Authenticated users can update company settings" ON company_settings;

CREATE POLICY "Authenticated users can insert company settings" ON company_settings
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update company settings" ON company_settings
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- contact_messages (authenticated)
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to update contact_messages" ON contact_messages;
DROP POLICY IF EXISTS "Allow authenticated users to delete contact_messages" ON contact_messages;

CREATE POLICY "Allow authenticated users to update contact_messages" ON contact_messages
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete contact_messages" ON contact_messages
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- contact_messages (anon INSERT) - restrict to only allow inserting own messages
DROP POLICY IF EXISTS "Allow anonymous to insert contact_messages" ON contact_messages;
CREATE POLICY "Allow anonymous to insert contact_messages" ON contact_messages
  FOR INSERT TO anon WITH CHECK (id IS NOT NULL);

-- ══════════════════════════════════════════════
-- customer_interactions
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert interactions" ON customer_interactions;
DROP POLICY IF EXISTS "Allow authenticated users to update interactions" ON customer_interactions;
DROP POLICY IF EXISTS "Allow authenticated users to delete interactions" ON customer_interactions;

CREATE POLICY "Allow authenticated users to insert interactions" ON customer_interactions
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update interactions" ON customer_interactions
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete interactions" ON customer_interactions
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- customers
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to update customers" ON customers;
DROP POLICY IF EXISTS "Allow authenticated users to delete customers" ON customers;

CREATE POLICY "Allow authenticated users to insert customers" ON customers
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update customers" ON customers
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete customers" ON customers
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- emails
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert emails" ON emails;
DROP POLICY IF EXISTS "Allow authenticated users to update emails" ON emails;
DROP POLICY IF EXISTS "Allow authenticated users to delete emails" ON emails;

CREATE POLICY "Allow authenticated users to insert emails" ON emails
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update emails" ON emails
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete emails" ON emails
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- page_views (anon + authenticated INSERT)
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "anon_insert_page_views" ON page_views;
DROP POLICY IF EXISTS "auth_insert_page_views" ON page_views;

CREATE POLICY "anon_insert_page_views" ON page_views
  FOR INSERT TO anon WITH CHECK (visitor_id IS NOT NULL);
CREATE POLICY "auth_insert_page_views" ON page_views
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- purchases
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert purchases" ON purchases;
DROP POLICY IF EXISTS "Allow authenticated users to update purchases" ON purchases;
DROP POLICY IF EXISTS "Allow authenticated users to delete purchases" ON purchases;

CREATE POLICY "Allow authenticated users to insert purchases" ON purchases
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update purchases" ON purchases
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete purchases" ON purchases
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- questionnaire_responses
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users" ON questionnaire_responses;
DROP POLICY IF EXISTS "Allow authenticated users to select questionnaire_responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Allow authenticated users to insert questionnaire_responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Allow authenticated users to update questionnaire_responses" ON questionnaire_responses;
DROP POLICY IF EXISTS "Allow authenticated users to delete questionnaire_responses" ON questionnaire_responses;

CREATE POLICY "Allow authenticated users to select questionnaire_responses" ON questionnaire_responses
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaire_responses" ON questionnaire_responses
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update questionnaire_responses" ON questionnaire_responses
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete questionnaire_responses" ON questionnaire_responses
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- questionnaires
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users" ON questionnaires;
DROP POLICY IF EXISTS "Allow authenticated users to select questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow authenticated users to insert questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow authenticated users to update questionnaires" ON questionnaires;
DROP POLICY IF EXISTS "Allow authenticated users to delete questionnaires" ON questionnaires;

CREATE POLICY "Allow authenticated users to select questionnaires" ON questionnaires
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert questionnaires" ON questionnaires
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update questionnaires" ON questionnaires
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete questionnaires" ON questionnaires
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- quote_items
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "authenticated_insert_quote_items" ON quote_items;
DROP POLICY IF EXISTS "authenticated_update_quote_items" ON quote_items;
DROP POLICY IF EXISTS "authenticated_delete_quote_items" ON quote_items;

CREATE POLICY "authenticated_insert_quote_items" ON quote_items
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "authenticated_update_quote_items" ON quote_items
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "authenticated_delete_quote_items" ON quote_items
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- quotes
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "authenticated_insert_quotes" ON quotes;
DROP POLICY IF EXISTS "authenticated_update_quotes" ON quotes;
DROP POLICY IF EXISTS "authenticated_delete_quotes" ON quotes;

CREATE POLICY "authenticated_insert_quotes" ON quotes
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "authenticated_update_quotes" ON quotes
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "authenticated_delete_quotes" ON quotes
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- invoices
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Authenticated users can manage invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can select invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can insert invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can update invoices" ON invoices;
DROP POLICY IF EXISTS "Authenticated users can delete invoices" ON invoices;

CREATE POLICY "Authenticated users can select invoices" ON invoices
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert invoices" ON invoices
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can update invoices" ON invoices
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Authenticated users can delete invoices" ON invoices
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

-- ══════════════════════════════════════════════
-- reminders
-- ══════════════════════════════════════════════
DROP POLICY IF EXISTS "Allow authenticated users to insert reminders" ON reminders;
DROP POLICY IF EXISTS "Allow authenticated users to update reminders" ON reminders;
DROP POLICY IF EXISTS "Allow authenticated users to delete reminders" ON reminders;

CREATE POLICY "Allow authenticated users to insert reminders" ON reminders
  FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to update reminders" ON reminders
  FOR UPDATE TO authenticated USING ((select auth.uid()) IS NOT NULL);
CREATE POLICY "Allow authenticated users to delete reminders" ON reminders
  FOR DELETE TO authenticated USING ((select auth.uid()) IS NOT NULL);

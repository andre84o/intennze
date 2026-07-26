-- Add missing indexes on foreign key columns for better JOIN/DELETE performance.
-- Using CREATE INDEX IF NOT EXISTS so this migration is safe to re-run.

-- code_snippets
CREATE INDEX IF NOT EXISTS idx_code_snippets_created_by ON code_snippets (created_by);

-- customer_interactions
CREATE INDEX IF NOT EXISTS idx_customer_interactions_created_by ON customer_interactions (created_by);
CREATE INDEX IF NOT EXISTS idx_customer_interactions_customer_id ON customer_interactions (customer_id);

-- customers
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON customers (created_by);

-- emails
CREATE INDEX IF NOT EXISTS idx_emails_customer_id ON emails (customer_id);

-- invoices
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices (created_by);

-- purchases
CREATE INDEX IF NOT EXISTS idx_purchases_created_by ON purchases (created_by);
CREATE INDEX IF NOT EXISTS idx_purchases_customer_id ON purchases (customer_id);

-- questionnaire_responses
CREATE INDEX IF NOT EXISTS idx_questionnaire_responses_questionnaire_id ON questionnaire_responses (questionnaire_id);

-- questionnaires
CREATE INDEX IF NOT EXISTS idx_questionnaires_created_by ON questionnaires (created_by);
CREATE INDEX IF NOT EXISTS idx_questionnaires_customer_id ON questionnaires (customer_id);

-- quote_items
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON quote_items (quote_id);

-- quotes
CREATE INDEX IF NOT EXISTS idx_quotes_created_by ON quotes (created_by);
CREATE INDEX IF NOT EXISTS idx_quotes_customer_id ON quotes (customer_id);

-- reminders
CREATE INDEX IF NOT EXISTS idx_reminders_created_by ON reminders (created_by);
CREATE INDEX IF NOT EXISTS idx_reminders_customer_id ON reminders (customer_id);

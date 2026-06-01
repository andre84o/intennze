-- Link customer_interactions rows of type "email" back to the full email record.
-- Nullable so existing rows and non-email interactions are unaffected.
ALTER TABLE customer_interactions
  ADD COLUMN IF NOT EXISTS email_id UUID REFERENCES emails(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_interactions_email_id
  ON customer_interactions(email_id);

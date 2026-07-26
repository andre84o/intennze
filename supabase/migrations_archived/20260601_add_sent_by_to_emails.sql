-- Add sent_by to track which authenticated user sent each outbound email.
-- Nullable to preserve compatibility with existing inbound rows and old outbound rows
-- that were inserted before this migration.
ALTER TABLE emails ADD COLUMN IF NOT EXISTS sent_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_emails_sent_by ON emails(sent_by);

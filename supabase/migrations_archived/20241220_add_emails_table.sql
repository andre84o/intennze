-- Emails table for storing sent and received emails
CREATE TABLE IF NOT EXISTS emails (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Email metadata
  message_id TEXT UNIQUE,
  thread_id TEXT,

  -- Direction: 'inbound' or 'outbound'
  direction TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),

  -- Sender/Recipient
  from_email TEXT NOT NULL,
  from_name TEXT,
  to_email TEXT NOT NULL,
  to_name TEXT,

  -- Content
  subject TEXT,
  body_text TEXT,
  body_html TEXT,

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  is_starred BOOLEAN DEFAULT FALSE,

  -- Reference to customer if applicable
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Original email date
  email_date TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE emails ENABLE ROW LEVEL SECURITY;

-- Policies for emails
CREATE POLICY "Allow authenticated users to read emails" ON emails FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert emails" ON emails FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update emails" ON emails FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete emails" ON emails FOR DELETE TO authenticated USING (true);

-- Indexes for emails
CREATE INDEX IF NOT EXISTS idx_emails_direction ON emails(direction);
CREATE INDEX IF NOT EXISTS idx_emails_is_read ON emails(is_read);
CREATE INDEX IF NOT EXISTS idx_emails_customer_id ON emails(customer_id);
CREATE INDEX IF NOT EXISTS idx_emails_email_date ON emails(email_date DESC);

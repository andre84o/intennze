-- Add is_read fields for notification tracking

-- Customers: track if admin has seen the lead
ALTER TABLE customers ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Questionnaires: track if admin has reviewed the response
ALTER TABLE questionnaires ADD COLUMN IF NOT EXISTS response_read BOOLEAN DEFAULT false;

-- Quotes: track if admin has seen the customer's response
ALTER TABLE quotes ADD COLUMN IF NOT EXISTS response_read BOOLEAN DEFAULT false;

-- Set existing records as read (so only new ones show as unread)
UPDATE customers SET is_read = true WHERE is_read IS NULL;
UPDATE questionnaires SET response_read = true WHERE response_read IS NULL;
UPDATE quotes SET response_read = true WHERE response_read IS NULL;

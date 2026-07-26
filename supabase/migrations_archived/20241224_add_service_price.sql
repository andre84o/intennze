-- Add service_price column to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_price integer;

-- Add comment
COMMENT ON COLUMN customers.service_price IS 'Monthly price for service agreement in SEK';

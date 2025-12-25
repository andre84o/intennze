-- Add contact_person and position fields to customers table
ALTER TABLE customers ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE customers ADD COLUMN IF NOT EXISTS position TEXT;

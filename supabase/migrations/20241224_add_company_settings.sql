-- Company settings table for invoice and business information
CREATE TABLE IF NOT EXISTS company_settings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Company information
  company_name TEXT,
  org_number TEXT,
  vat_number TEXT,

  -- Address
  address TEXT,
  postal_code TEXT,
  city TEXT,
  country TEXT DEFAULT 'Sverige',

  -- Contact
  email TEXT,
  phone TEXT,
  website TEXT,

  -- Payment information
  bankgiro TEXT,
  plusgiro TEXT,
  swish TEXT,
  bank_name TEXT,
  bank_account TEXT,
  iban TEXT,
  bic TEXT
);

-- Enable RLS
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read and modify company settings
CREATE POLICY "Authenticated users can read company settings"
  ON company_settings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert company settings"
  ON company_settings FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update company settings"
  ON company_settings FOR UPDATE TO authenticated USING (true);

-- Trigger to auto-update updated_at
CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert a default row
INSERT INTO company_settings (company_name, email)
VALUES ('Intenzze Webbstudio', 'info@intenzze.se')
ON CONFLICT DO NOTHING;

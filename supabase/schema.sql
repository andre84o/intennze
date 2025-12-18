-- Customers table
CREATE TABLE IF NOT EXISTS customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Basic info
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,

  -- Address
  address TEXT,
  postal_code TEXT,
  city TEXT,

  -- Business info
  company_name TEXT,
  org_number TEXT,

  -- Sales info
  budget DECIMAL(10, 2),
  wishes TEXT,
  notes TEXT,

  -- Status
  status TEXT DEFAULT 'lead' CHECK (status IN ('lead', 'contacted', 'negotiating', 'customer', 'churned')),
  has_purchased BOOLEAN DEFAULT FALSE,

  -- Service info
  has_service_agreement BOOLEAN DEFAULT FALSE,
  service_type TEXT,
  service_start_date DATE,
  service_renewal_date DATE,

  -- Source
  source TEXT,

  -- User who created
  created_by UUID REFERENCES auth.users(id)
);

-- Reminders table
CREATE TABLE IF NOT EXISTS reminders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  description TEXT,

  reminder_date DATE NOT NULL,
  reminder_time TIME,

  type TEXT DEFAULT 'general' CHECK (type IN ('general', 'follow_up', 'service_update', 'renewal', 'upsell')),

  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,

  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('weekly', 'monthly', 'quarterly', 'yearly')),

  created_by UUID REFERENCES auth.users(id)
);

-- Customer interactions/history
CREATE TABLE IF NOT EXISTS customer_interactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  type TEXT NOT NULL CHECK (type IN ('call', 'email', 'meeting', 'note', 'sale', 'other')),
  description TEXT NOT NULL,

  created_by UUID REFERENCES auth.users(id)
);

-- Purchases table
CREATE TABLE IF NOT EXISTS purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,

  product_name TEXT NOT NULL,
  description TEXT,
  amount DECIMAL(10, 2) NOT NULL,

  is_recurring BOOLEAN DEFAULT FALSE,
  recurring_interval TEXT CHECK (recurring_interval IN ('monthly', 'quarterly', 'yearly')),

  created_by UUID REFERENCES auth.users(id)
);

-- Enable Row Level Security
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchases ENABLE ROW LEVEL SECURITY;

-- Policies (allow authenticated users to access all data)
CREATE POLICY "Allow authenticated users to read customers" ON customers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert customers" ON customers FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update customers" ON customers FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete customers" ON customers FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read reminders" ON reminders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert reminders" ON reminders FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update reminders" ON reminders FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete reminders" ON reminders FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read interactions" ON customer_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert interactions" ON customer_interactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update interactions" ON customer_interactions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete interactions" ON customer_interactions FOR DELETE TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to read purchases" ON purchases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert purchases" ON purchases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update purchases" ON purchases FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete purchases" ON purchases FOR DELETE TO authenticated USING (true);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_has_purchased ON customers(has_purchased);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed);

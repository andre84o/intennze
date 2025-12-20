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
  created_by UUID REFERENCES auth.users(id),

  -- Meta Conversions API
  meta_lead_id TEXT,
  fbclid TEXT
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

  -- Notification tracking
  notification_sent BOOLEAN DEFAULT FALSE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,

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
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Quotes table
CREATE TABLE IF NOT EXISTS quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Quote number (auto-generated)
  quote_number SERIAL,

  -- Customer reference
  customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,

  -- Quote details
  title TEXT NOT NULL,
  description TEXT,

  -- Valid dates
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,

  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'accepted', 'declined', 'expired')),

  -- Totals
  subtotal DECIMAL(10, 2) DEFAULT 0,
  vat_rate DECIMAL(5, 2) DEFAULT 25.00,
  vat_amount DECIMAL(10, 2) DEFAULT 0,
  total DECIMAL(10, 2) DEFAULT 0,

  -- Notes
  notes TEXT,
  terms TEXT,

  -- Email tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  sent_to_email TEXT,

  -- Public access for customer response
  public_token TEXT UNIQUE,
  customer_response_at TIMESTAMP WITH TIME ZONE,
  customer_response_note TEXT,

  created_by UUID REFERENCES auth.users(id)
);

-- Quote items table
CREATE TABLE IF NOT EXISTS quote_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  quote_id UUID REFERENCES quotes(id) ON DELETE CASCADE,

  description TEXT NOT NULL,
  quantity DECIMAL(10, 2) DEFAULT 1,
  unit TEXT DEFAULT 'st',
  unit_price DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,

  sort_order INTEGER DEFAULT 0
);

-- Enable RLS for quotes
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE quote_items ENABLE ROW LEVEL SECURITY;

-- Policies for quotes
CREATE POLICY "Allow authenticated users to read quotes" ON quotes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert quotes" ON quotes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update quotes" ON quotes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete quotes" ON quotes FOR DELETE TO authenticated USING (true);
-- Allow anonymous access to quotes via public_token
CREATE POLICY "Allow anonymous to read quotes by token" ON quotes FOR SELECT TO anon USING (public_token IS NOT NULL);
CREATE POLICY "Allow anonymous to update quote response" ON quotes FOR UPDATE TO anon USING (public_token IS NOT NULL);

CREATE POLICY "Allow authenticated users to read quote_items" ON quote_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert quote_items" ON quote_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update quote_items" ON quote_items FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete quote_items" ON quote_items FOR DELETE TO authenticated USING (true);
-- Allow anonymous access to quote_items for quotes with public_token
CREATE POLICY "Allow anonymous to read quote_items" ON quote_items FOR SELECT TO anon USING (
  EXISTS (SELECT 1 FROM quotes WHERE quotes.id = quote_items.quote_id AND quotes.public_token IS NOT NULL)
);

-- Trigger to auto-update updated_at for quotes
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster queries
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_has_purchased ON customers(has_purchased);
CREATE INDEX IF NOT EXISTS idx_reminders_date ON reminders(reminder_date);
CREATE INDEX IF NOT EXISTS idx_reminders_completed ON reminders(is_completed);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_public_token ON quotes(public_token);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote ON quote_items(quote_id);

-- Page views / Analytics table
CREATE TABLE IF NOT EXISTS page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Page info
  page_path TEXT NOT NULL,
  page_title TEXT,

  -- Visitor info
  visitor_id TEXT NOT NULL,
  session_id TEXT,

  -- Device info
  device_type TEXT CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
  browser TEXT,
  os TEXT,

  -- Traffic source
  referrer TEXT,
  source TEXT CHECK (source IN ('direct', 'google', 'facebook', 'instagram', 'linkedin', 'other')),
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,

  -- Location (optional)
  country TEXT,
  city TEXT
);

-- Enable RLS
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert (for tracking)
CREATE POLICY "Allow anonymous insert page_views" ON page_views FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow authenticated insert page_views" ON page_views FOR INSERT TO authenticated WITH CHECK (true);

-- Only authenticated users can read
CREATE POLICY "Allow authenticated users to read page_views" ON page_views FOR SELECT TO authenticated USING (true);

-- Indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_page_views_created_at ON page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_page_views_device ON page_views(device_type);
CREATE INDEX IF NOT EXISTS idx_page_views_source ON page_views(source);
CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(page_path);

-- User preferences table
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,

  -- Sidebar menu order (JSON array of menu item hrefs)
  sidebar_order JSONB DEFAULT NULL
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Users can only access their own preferences
CREATE POLICY "Users can read own preferences" ON user_preferences FOR SELECT TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can insert own preferences" ON user_preferences FOR INSERT TO authenticated WITH CHECK ((select auth.uid()) = user_id);
CREATE POLICY "Users can update own preferences" ON user_preferences FOR UPDATE TO authenticated USING ((select auth.uid()) = user_id);
CREATE POLICY "Users can delete own preferences" ON user_preferences FOR DELETE TO authenticated USING ((select auth.uid()) = user_id);

-- Trigger to auto-update updated_at for user_preferences
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Index for faster user lookup
CREATE INDEX IF NOT EXISTS idx_user_preferences_user_id ON user_preferences(user_id);

-- Create invoices table for service agreement billing
CREATE TABLE IF NOT EXISTS invoices (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,

  -- Customer reference
  customer_id uuid REFERENCES customers(id) ON DELETE CASCADE NOT NULL,

  -- Invoice details
  invoice_number serial NOT NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date NOT NULL,

  -- Period this invoice covers
  period_start date NOT NULL,
  period_end date NOT NULL,

  -- Amounts
  amount integer NOT NULL, -- Amount excl VAT in SEK
  vat_rate integer NOT NULL DEFAULT 25,
  vat_amount integer NOT NULL, -- VAT amount in SEK
  total integer NOT NULL, -- Total incl VAT in SEK

  -- Description
  description text,

  -- Status tracking
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled')),
  sent_at timestamp with time zone,
  paid_at timestamp with time zone,

  -- Reference to service agreement
  service_type text,

  created_by uuid REFERENCES auth.users(id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS invoices_customer_id_idx ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS invoices_status_idx ON invoices(status);
CREATE INDEX IF NOT EXISTS invoices_invoice_date_idx ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS invoices_due_date_idx ON invoices(due_date);

-- Enable RLS
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Authenticated users can manage invoices" ON invoices
  FOR ALL USING (auth.role() = 'authenticated');

-- Add service_price column to customers if not exists
ALTER TABLE customers ADD COLUMN IF NOT EXISTS service_price integer;

-- Add comment
COMMENT ON TABLE invoices IS 'Monthly invoices for service agreements';
COMMENT ON COLUMN invoices.amount IS 'Amount excluding VAT in SEK';
COMMENT ON COLUMN invoices.vat_amount IS 'VAT amount in SEK (25%)';
COMMENT ON COLUMN invoices.total IS 'Total amount including VAT in SEK';

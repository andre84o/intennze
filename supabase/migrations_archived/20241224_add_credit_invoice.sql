-- Add credit invoice support to invoices table
-- is_credit_note: true if this invoice is a credit note (kreditfaktura)
-- original_invoice_id: reference to the invoice being credited

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS is_credit_note boolean DEFAULT false;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS original_invoice_id uuid REFERENCES invoices(id);

-- Add comment
COMMENT ON COLUMN invoices.is_credit_note IS 'True if this is a credit note (kreditfaktura)';
COMMENT ON COLUMN invoices.original_invoice_id IS 'Reference to the original invoice being credited';

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS invoices_original_invoice_id_idx ON invoices(original_invoice_id);

-- Code snippets table for saving and searching code
CREATE TABLE IF NOT EXISTS code_snippets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Content
  title TEXT NOT NULL,
  description TEXT,
  code TEXT NOT NULL,
  language TEXT,
  tags TEXT[] DEFAULT '{}',

  -- Meta
  is_favorite BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS
ALTER TABLE code_snippets ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow authenticated users to read code_snippets" ON code_snippets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert code_snippets" ON code_snippets FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow authenticated users to update code_snippets" ON code_snippets FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to delete code_snippets" ON code_snippets FOR DELETE TO authenticated USING (true);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_code_snippets_language ON code_snippets(language);
CREATE INDEX IF NOT EXISTS idx_code_snippets_is_favorite ON code_snippets(is_favorite);
CREATE INDEX IF NOT EXISTS idx_code_snippets_created_at ON code_snippets(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_code_snippets_tags ON code_snippets USING GIN(tags);

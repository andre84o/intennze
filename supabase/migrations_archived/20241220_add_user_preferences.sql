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

-- Users can only access their own preferences (using select for better performance)
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

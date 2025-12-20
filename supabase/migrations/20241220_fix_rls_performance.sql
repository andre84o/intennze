-- Fix RLS performance by wrapping auth.uid() in (select ...) to prevent re-evaluation per row

-- Fix questionnaires policies
DROP POLICY IF EXISTS "Allow authenticated users" ON questionnaires;
CREATE POLICY "Allow authenticated users" ON questionnaires
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix questionnaire_responses policies
DROP POLICY IF EXISTS "Allow authenticated users" ON questionnaire_responses;
CREATE POLICY "Allow authenticated users" ON questionnaire_responses
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

-- Fix user_preferences policies (if they exist without the select wrapper)
DROP POLICY IF EXISTS "Users can read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can delete own preferences" ON user_preferences;

CREATE POLICY "Users can read own preferences" ON user_preferences
  FOR SELECT TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE TO authenticated
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete own preferences" ON user_preferences
  FOR DELETE TO authenticated
  USING ((select auth.uid()) = user_id);

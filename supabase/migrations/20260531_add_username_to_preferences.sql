ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

CREATE INDEX IF NOT EXISTS idx_user_preferences_username ON user_preferences(username);

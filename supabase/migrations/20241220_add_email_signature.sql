-- Add email_signature column to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS email_signature TEXT DEFAULT NULL;

-- Add logo settings columns to user_preferences table
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS logo_height INTEGER DEFAULT 32;
ALTER TABLE user_preferences ADD COLUMN IF NOT EXISTS logo_position TEXT DEFAULT 'left' CHECK (logo_position IN ('left', 'center', 'right'));

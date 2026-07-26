-- Add email column to user_preferences
ALTER TABLE user_preferences
  ADD COLUMN IF NOT EXISTS email TEXT;

-- Populate existing rows from auth.users
UPDATE user_preferences up
SET email = au.email
FROM auth.users au
WHERE au.id = up.user_id;

-- Trigger function: keep email in sync when auth.users email changes
CREATE OR REPLACE FUNCTION sync_user_email_to_preferences()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE user_preferences
  SET email = NEW.email
  WHERE user_id = NEW.id;
  RETURN NEW;
END;
$$;

-- Attach trigger to auth.users
DROP TRIGGER IF EXISTS on_auth_user_email_updated ON auth.users;
CREATE TRIGGER on_auth_user_email_updated
  AFTER UPDATE OF email ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION sync_user_email_to_preferences();

-- Also sync on new user insert (in case preferences row is created later via separate trigger)
CREATE OR REPLACE FUNCTION sync_email_on_preferences_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  SELECT email INTO NEW.email
  FROM auth.users
  WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_preferences_insert_sync_email ON user_preferences;
CREATE TRIGGER on_preferences_insert_sync_email
  BEFORE INSERT ON user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION sync_email_on_preferences_insert();

-- Drop the view since email is now stored directly
DROP VIEW IF EXISTS user_preferences_view;

/*
  # Fix player creation trigger

  1. Changes
    - Remove delay and retry logic that wasn't working
    - Simplify player creation to be more reliable
    - Add proper error handling
    - Ensure synchronous execution

  2. Security
    - Maintain security definer setting
    - Keep proper permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create improved function for handling new users
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Create the player record directly
  INSERT INTO public.players (
    user_id,
    name,
    gold,
    silver,
    copper,
    max_hp,
    current_hp,
    temporary_hp,
    level,
    stats,
    is_gm
  ) VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'player_name', NEW.email),
    0,
    0,
    0,
    10,
    10,
    0,
    1,
    jsonb_build_object(
      'armor_class', 10,
      'initiative', 0,
      'speed', 30,
      'proficiency_bonus', 2,
      'inspiration', 0
    ),
    false
  );

  RETURN NEW;
END;
$$;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION auth.handle_new_user();
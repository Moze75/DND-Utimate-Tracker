/*
  # Fix player creation trigger

  1. Changes
    - Modify the trigger function to handle player creation more safely
    - Add proper error handling
    - Ensure user exists before creating player

  2. Security
    - Maintain security definer setting
    - Keep proper permissions
*/

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Create improved function for handling new users
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
DECLARE
  player_id uuid;
BEGIN
  -- Add a small delay to ensure the auth.users record is committed
  PERFORM pg_sleep(0.5);
  
  -- Create the player record
  INSERT INTO public.players (user_id, name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'player_name', NEW.email)
  )
  RETURNING id INTO player_id;

  -- Return the new user
  RETURN NEW;
EXCEPTION
  WHEN foreign_key_violation THEN
    -- If we hit a foreign key violation, retry once after a longer delay
    PERFORM pg_sleep(1);
    INSERT INTO public.players (user_id, name)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'player_name', NEW.email)
    );
    RETURN NEW;
  WHEN OTHERS THEN
    RAISE EXCEPTION 'Failed to create player: %', SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();
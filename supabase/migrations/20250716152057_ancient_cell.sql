/*
  # Fix player profile update issues
  
  1. Changes
    - Create a simpler direct update function
    - Fix type handling for arrays and JSON data
    - Add detailed error logging
    
  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication flow
*/

-- Create a simpler function to update player profile
CREATE OR REPLACE FUNCTION update_player_profile_direct(
    p_id uuid,
    p_adventurer_name text,
    p_class text,
    p_subclass text,
    p_race text,
    p_background text,
    p_alignment text,
    p_languages text[],
    p_age text,
    p_gender text,
    p_character_history text,
    p_level integer,
    p_hit_dice jsonb,
    p_stats jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    updated_player jsonb;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get player's user_id
    SELECT user_id INTO player_user_id
    FROM players
    WHERE id = p_id;
    
    -- Validate ownership
    IF player_user_id != current_user_id THEN
        RAISE EXCEPTION 'You can only update your own characters';
    END IF;
    
    -- Update the player with explicit parameters
    UPDATE players
    SET 
        adventurer_name = p_adventurer_name,
        class = p_class,
        subclass = p_subclass,
        race = p_race,
        background = p_background,
        alignment = p_alignment,
        languages = p_languages,
        age = p_age,
        gender = p_gender,
        character_history = p_character_history,
        level = p_level,
        hit_dice = p_hit_dice,
        stats = p_stats
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_player_profile_direct(
    uuid, text, text, text, text, text, text, text[], 
    text, text, text, integer, jsonb, jsonb
) TO authenticated;

-- Create a function to log update errors for debugging
CREATE OR REPLACE FUNCTION log_player_update_error(
    p_id uuid,
    p_error text,
    p_data jsonb
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    log_id uuid;
BEGIN
    -- Create a log table if it doesn't exist
    CREATE TABLE IF NOT EXISTS player_update_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id uuid NOT NULL,
        error_message text NOT NULL,
        update_data jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
    );
    
    -- Insert the error log
    INSERT INTO player_update_logs (player_id, error_message, update_data)
    VALUES (p_id, p_error, p_data)
    RETURNING id INTO log_id;
    
    RETURN 'Error logged with ID: ' || log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_player_update_error(uuid, text, jsonb) TO authenticated;

-- Enable RLS on the log table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'player_update_logs'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE player_update_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for the log table
        DROP POLICY IF EXISTS "Users can see their own logs" ON player_update_logs;
        CREATE POLICY "Users can see their own logs"
        ON player_update_logs
        FOR SELECT
        TO authenticated
        USING (player_id IN (
            SELECT id FROM players WHERE user_id = auth.uid()
        ));
    END IF;
END $$;

-- Final verification
DO $$
DECLARE
    function_count integer;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('update_player_profile_direct', 'log_player_update_error')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== PLAYER PROFILE UPDATE FIX ===';
    RAISE NOTICE 'Functions created: %', function_count;
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Player profile update functions created successfully';
        RAISE NOTICE '✅ Direct update function should resolve the issues with profile saving';
        RAISE NOTICE '✅ Error logging function will help diagnose any remaining issues';
    ELSE
        RAISE WARNING '⚠️ Some functions may not have been created correctly';
    END IF;
END $$;
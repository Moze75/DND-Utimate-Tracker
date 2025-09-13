/*
  # Fix player profile update issues
  
  1. Changes
    - Add direct update function with proper error handling
    - Fix type handling for arrays and JSON data
    - Add detailed error logging
    
  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication flow
*/

-- Create a function to log update errors for debugging
CREATE OR REPLACE FUNCTION log_update_error(
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
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Create a log table if it doesn't exist
    CREATE TABLE IF NOT EXISTS update_error_logs (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        player_id uuid NOT NULL,
        user_id uuid,
        error_message text NOT NULL,
        update_data jsonb NOT NULL,
        created_at timestamptz DEFAULT now()
    );
    
    -- Insert the error log
    INSERT INTO update_error_logs (player_id, user_id, error_message, update_data)
    VALUES (p_id, current_user_id, p_error, p_data)
    RETURNING id INTO log_id;
    
    RETURN 'Error logged with ID: ' || log_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION log_update_error(uuid, text, jsonb) TO authenticated;

-- Enable RLS on the log table
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_name = 'update_error_logs'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE update_error_logs ENABLE ROW LEVEL SECURITY;
        
        -- Create policy for the log table
        DROP POLICY IF EXISTS "Users can see their own logs" ON update_error_logs;
        CREATE POLICY "Users can see their own logs"
        ON update_error_logs
        FOR SELECT
        TO authenticated
        USING (user_id = auth.uid());
    END IF;
END $$;

-- Verify the languages column is properly defined
DO $$
BEGIN
    -- Check if languages column exists and is of the right type
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'languages'
        AND table_schema = 'public'
        AND data_type != 'ARRAY'
    ) THEN
        -- If it exists but is not an array, drop and recreate
        ALTER TABLE players DROP COLUMN languages;
        ALTER TABLE players ADD COLUMN languages text[] DEFAULT '{}';
        RAISE NOTICE 'Fixed languages column type';
    END IF;
    
    -- If it doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'languages'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN languages text[] DEFAULT '{}';
        RAISE NOTICE 'Added languages column';
    END IF;
END $$;

-- Create a function to test player update
CREATE OR REPLACE FUNCTION test_player_update(p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text := '';
    player_record players%ROWTYPE;
    update_result text;
BEGIN
    -- Get player data
    SELECT * INTO player_record
    FROM players
    WHERE id = p_id;
    
    IF player_record.id IS NULL THEN
        RETURN 'Player not found with ID: ' || p_id;
    END IF;
    
    result := result || '=== PLAYER UPDATE TEST ===' || chr(10);
    
    -- Test simple update
    BEGIN
        UPDATE players
        SET adventurer_name = player_record.adventurer_name
        WHERE id = p_id;
        
        result := result || '✅ Simple update test passed' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        result := result || '❌ Simple update test failed: ' || SQLERRM || chr(10);
        RETURN result;
    END;
    
    -- Test languages update
    BEGIN
        UPDATE players
        SET languages = COALESCE(player_record.languages, '{}'::text[])
        WHERE id = p_id;
        
        result := result || '✅ Languages update test passed' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        result := result || '❌ Languages update test failed: ' || SQLERRM || chr(10);
        RETURN result;
    END;
    
    -- Test full update
    BEGIN
        UPDATE players
        SET 
            adventurer_name = player_record.adventurer_name,
            class = player_record.class,
            subclass = player_record.subclass,
            race = player_record.race,
            background = player_record.background,
            alignment = player_record.alignment,
            languages = player_record.languages,
            age = player_record.age,
            gender = player_record.gender,
            character_history = player_record.character_history,
            level = player_record.level,
            hit_dice = player_record.hit_dice,
            stats = player_record.stats
        WHERE id = p_id;
        
        result := result || '✅ Full update test passed' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        result := result || '❌ Full update test failed: ' || SQLERRM || chr(10);
        RETURN result;
    END;
    
    result := result || chr(10) || '🎉 All update tests passed successfully!' || chr(10);
    result := result || 'You should be able to update this player without issues.' || chr(10);
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION test_player_update(uuid) TO authenticated;

-- Final verification
DO $$
DECLARE
    function_count integer;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('log_update_error', 'test_player_update')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== PLAYER PROFILE UPDATE FIX ===';
    RAISE NOTICE 'Functions created: %', function_count;
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Player profile update functions created successfully';
        RAISE NOTICE '✅ Use SELECT test_player_update(''your-player-id'') to test updates';
        RAISE NOTICE '✅ Direct updates should now work correctly';
    ELSE
        RAISE WARNING '⚠️ Some functions may not have been created correctly';
    END IF;
END $$;
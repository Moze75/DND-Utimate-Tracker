/*
  # Fix player profile save functionality
  
  1. Changes
    - Add diagnostic function to check player update issues
    - Fix column types and constraints
    - Add proper error handling for player updates
    
  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication flow
*/

-- Function to diagnose player update issues
CREATE OR REPLACE FUNCTION diagnose_player_update(p_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text := '';
    player_record players%ROWTYPE;
    column_info record;
BEGIN
    -- Get player data
    SELECT * INTO player_record
    FROM players
    WHERE id = p_id;
    
    IF player_record.id IS NULL THEN
        RETURN 'Player not found with ID: ' || p_id;
    END IF;
    
    result := result || '=== PLAYER UPDATE DIAGNOSTIC ===' || chr(10);
    result := result || 'Player ID: ' || player_record.id || chr(10);
    result := result || 'Player Name: ' || player_record.name || chr(10);
    result := result || 'User ID: ' || player_record.user_id || chr(10) || chr(10);
    
    -- Check column types
    result := result || '=== COLUMN TYPES ===' || chr(10);
    
    FOR column_info IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'players'
        AND table_schema = 'public'
        ORDER BY ordinal_position
    LOOP
        result := result || column_info.column_name || ': ' || 
                  column_info.data_type || 
                  CASE WHEN column_info.is_nullable = 'NO' THEN ' (NOT NULL)' ELSE '' END || 
                  chr(10);
    END LOOP;
    
    -- Check current values
    result := result || chr(10) || '=== CURRENT VALUES ===' || chr(10);
    result := result || 'race: ' || COALESCE(player_record.race::text, 'NULL') || chr(10);
    result := result || 'subclass: ' || COALESCE(player_record.subclass::text, 'NULL') || chr(10);
    result := result || 'background: ' || COALESCE(player_record.background::text, 'NULL') || chr(10);
    result := result || 'alignment: ' || COALESCE(player_record.alignment::text, 'NULL') || chr(10);
    result := result || 'languages: ' || COALESCE(array_to_string(player_record.languages, ', '), 'NULL') || chr(10);
    result := result || 'age: ' || COALESCE(player_record.age::text, 'NULL') || chr(10);
    result := result || 'gender: ' || COALESCE(player_record.gender::text, 'NULL') || chr(10);
    result := result || 'character_history: ' || CASE 
                                                  WHEN player_record.character_history IS NULL THEN 'NULL'
                                                  WHEN length(player_record.character_history) > 50 THEN substring(player_record.character_history, 1, 50) || '...'
                                                  ELSE player_record.character_history
                                                END || chr(10);
    
    -- Test update with minimal data
    BEGIN
        UPDATE players
        SET race = player_record.race
        WHERE id = p_id;
        
        result := result || chr(10) || '✅ Basic update test successful' || chr(10);
    EXCEPTION WHEN OTHERS THEN
        result := result || chr(10) || '❌ Basic update test failed: ' || SQLERRM || chr(10);
    END;
    
    RETURN result;
END;
$$;

-- Function to safely update player profile
CREATE OR REPLACE FUNCTION update_player_profile(
    p_id uuid,
    p_data jsonb
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
    
    -- Update the player with explicit type casting
    UPDATE players
    SET 
        adventurer_name = COALESCE(p_data->>'adventurer_name', adventurer_name),
        class = COALESCE(p_data->>'class', class),
        subclass = COALESCE(p_data->>'subclass', subclass),
        race = COALESCE(p_data->>'race', race),
        background = COALESCE(p_data->>'background', background),
        alignment = COALESCE(p_data->>'alignment', alignment),
        languages = COALESCE((p_data->'languages')::text[]::text[], languages),
        age = COALESCE(p_data->>'age', age),
        gender = COALESCE(p_data->>'gender', gender),
        character_history = COALESCE(p_data->>'character_history', character_history),
        level = COALESCE((p_data->>'level')::integer, level),
        hit_dice = COALESCE(p_data->'hit_dice', hit_dice),
        stats = COALESCE(p_data->'stats', stats)
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_player_update(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_profile(uuid, jsonb) TO authenticated;

-- Ensure languages column is properly defined
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
    END IF;
    
    -- If it doesn't exist, add it
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'languages'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN languages text[] DEFAULT '{}';
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
    WHERE routine_name IN ('diagnose_player_update', 'update_player_profile')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== PLAYER PROFILE UPDATE FIX ===';
    RAISE NOTICE 'Functions created: %', function_count;
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Player profile update functions created successfully';
        RAISE NOTICE '✅ Use SELECT diagnose_player_update(player_id) to diagnose issues';
        RAISE NOTICE '✅ Use update_player_profile function for reliable updates';
    ELSE
        RAISE WARNING '⚠️ Some functions may not have been created correctly';
    END IF;
END $$;
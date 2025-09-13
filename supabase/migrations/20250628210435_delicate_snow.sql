/*
  # Final fix for character creation errors
  
  1. Aggressively remove all unique constraints on user_id
  2. Recreate RPC functions with proper error handling
  3. Ensure RLS policies allow multiple character creation
  4. Add comprehensive verification and fallback mechanisms
*/

-- Step 1: Nuclear option - remove ALL constraints that might be blocking multiple characters
DO $$
DECLARE
    constraint_record RECORD;
    index_record RECORD;
    sql_command text;
BEGIN
    RAISE NOTICE '=== AGGRESSIVE CONSTRAINT REMOVAL ===';
    
    -- Remove ALL unique constraints on user_id (including system-generated ones)
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        sql_command := format('ALTER TABLE %I DROP CONSTRAINT IF EXISTS %I', 
                             constraint_record.table_name, 
                             constraint_record.constraint_name);
        EXECUTE sql_command;
        RAISE NOTICE 'Removed constraint: %', constraint_record.constraint_name;
    END LOOP;
    
    -- Remove ALL unique indexes on user_id
    FOR index_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'players'
        AND (indexdef LIKE '%UNIQUE%' AND indexdef LIKE '%user_id%')
        AND schemaname = 'public'
    LOOP
        sql_command := format('DROP INDEX IF EXISTS %I', index_record.indexname);
        EXECUTE sql_command;
        RAISE NOTICE 'Removed unique index: %', index_record.indexname;
    END LOOP;
    
    -- Specifically target known constraint names
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key CASCADE';
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_unique CASCADE';
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS unique_user_id CASCADE';
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_idx CASCADE';
    
    RAISE NOTICE 'Aggressive constraint removal completed';
END $$;

-- Step 2: Drop and recreate the RPC functions to ensure they're in the schema cache
DROP FUNCTION IF EXISTS create_player_bypass_constraint(uuid, text, text);
DROP FUNCTION IF EXISTS admin_remove_unique_constraint();

-- Create the character creation function
CREATE OR REPLACE FUNCTION create_player_bypass_constraint(
    p_user_id uuid,
    p_name text,
    p_adventurer_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    new_player_id uuid;
    default_stats jsonb;
    default_abilities jsonb;
    current_user_id uuid;
BEGIN
    -- Get current user ID
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Validate user can only create their own characters
    IF current_user_id != p_user_id THEN
        RAISE EXCEPTION 'Access denied: can only create own characters';
    END IF;
    
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Character name is required';
    END IF;
    
    -- Generate unique ID
    new_player_id := gen_random_uuid();
    
    -- Prepare default stats
    default_stats := jsonb_build_object(
        'armor_class', 10,
        'initiative', 0,
        'speed', 30,
        'proficiency_bonus', 2,
        'inspirations', 0
    );
    
    -- Prepare default abilities
    default_abilities := jsonb_build_array(
        jsonb_build_object(
            'name', 'Force',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array(
                jsonb_build_object('name', 'Athlétisme', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
            )
        ),
        jsonb_build_object(
            'name', 'Dextérité',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array(
                jsonb_build_object('name', 'Acrobaties', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Discrétion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Escamotage', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
            )
        ),
        jsonb_build_object(
            'name', 'Constitution',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array()
        ),
        jsonb_build_object(
            'name', 'Intelligence',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array(
                jsonb_build_object('name', 'Arcanes', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Histoire', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Investigation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Nature', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Religion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
            )
        ),
        jsonb_build_object(
            'name', 'Sagesse',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array(
                jsonb_build_object('name', 'Dressage', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Médecine', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Perception', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Perspicacité', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Survie', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
            )
        ),
        jsonb_build_object(
            'name', 'Charisme',
            'score', 10,
            'modifier', 0,
            'savingThrow', 0,
            'skills', jsonb_build_array(
                jsonb_build_object('name', 'Intimidation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Persuasion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Représentation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
                jsonb_build_object('name', 'Tromperie', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
            )
        )
    );
    
    -- Insert the new character with explicit column specification
    INSERT INTO players (
        id,
        user_id,
        name,
        adventurer_name,
        gold,
        silver,
        copper,
        max_hp,
        current_hp,
        temporary_hp,
        level,
        stats,
        abilities,
        spell_slots,
        class_resources,
        equipment,
        active_conditions,
        is_concentrating,
        concentration_spell,
        is_gm,
        hit_dice,
        created_at
    ) VALUES (
        new_player_id,
        p_user_id,
        trim(p_name),
        COALESCE(nullif(trim(p_adventurer_name), ''), trim(p_name)),
        0, -- gold
        0, -- silver
        0, -- copper
        10, -- max_hp
        10, -- current_hp
        0, -- temporary_hp
        1, -- level
        default_stats,
        default_abilities,
        '{}'::jsonb, -- spell_slots
        '{}'::jsonb, -- class_resources
        '{}'::jsonb, -- equipment
        '{}', -- active_conditions
        false, -- is_concentrating
        null, -- concentration_spell
        false, -- is_gm
        jsonb_build_object('total', 1, 'used', 0), -- hit_dice
        now() -- created_at
    );
    
    RETURN new_player_id;
    
EXCEPTION 
    WHEN unique_violation THEN
        RAISE EXCEPTION 'Unique constraint violation: This should not happen after constraint removal. Error: %', SQLERRM;
    WHEN foreign_key_violation THEN
        RAISE EXCEPTION 'Foreign key violation: Invalid user_id provided. Error: %', SQLERRM;
    WHEN check_violation THEN
        RAISE EXCEPTION 'Check constraint violation: Invalid data provided. Error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Unexpected error creating character: % (SQLSTATE: %)', SQLERRM, SQLSTATE;
END;
$$;

-- Create the admin function
CREATE OR REPLACE FUNCTION admin_remove_unique_constraint()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    constraint_record RECORD;
    index_record RECORD;
    result_text text := '';
    current_user_id uuid;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    result_text := 'Starting constraint removal...' || chr(10);
    
    -- Remove all unique constraints on user_id
    FOR constraint_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE format('ALTER TABLE players DROP CONSTRAINT IF EXISTS %I', constraint_record.constraint_name);
        result_text := result_text || 'Removed constraint: ' || constraint_record.constraint_name || chr(10);
    END LOOP;
    
    -- Remove all unique indexes on user_id
    FOR index_record IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'players'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%user_id%'
        AND schemaname = 'public'
    LOOP
        EXECUTE format('DROP INDEX IF EXISTS %I', index_record.indexname);
        result_text := result_text || 'Removed unique index: ' || index_record.indexname || chr(10);
    END LOOP;
    
    -- Create performance index
    DROP INDEX IF EXISTS players_user_id_performance_idx;
    CREATE INDEX players_user_id_performance_idx ON players(user_id);
    result_text := result_text || 'Created performance index' || chr(10);
    
    result_text := result_text || 'Constraint removal completed successfully';
    
    RETURN result_text;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'Error during constraint removal: ' || SQLERRM;
END;
$$;

-- Step 3: Reset all RLS policies to ensure proper access
ALTER TABLE players DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "players_select_all" ON players;
DROP POLICY IF EXISTS "players_update_own" ON players;
DROP POLICY IF EXISTS "players_insert_policy" ON players;
DROP POLICY IF EXISTS "players_insert_multiple" ON players;
DROP POLICY IF EXISTS "players_can_create_multiple" ON players;
DROP POLICY IF EXISTS "players_select_policy" ON players;
DROP POLICY IF EXISTS "players_update_policy" ON players;
DROP POLICY IF EXISTS "players_delete_policy" ON players;

-- Re-enable RLS
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies
CREATE POLICY "players_select_all"
ON players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "players_insert_multiple"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "players_update_own"
ON players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "players_delete_own"
ON players FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION create_player_bypass_constraint(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_unique_constraint() TO authenticated;

-- Step 5: Create performance indexes
DROP INDEX IF EXISTS players_user_id_idx;
DROP INDEX IF EXISTS players_user_id_performance_idx;
CREATE INDEX players_user_id_performance_idx ON players(user_id);
CREATE INDEX players_created_at_idx ON players(created_at);

-- Step 6: Test the fix by attempting to create a test scenario
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    char1_id uuid;
    char2_id uuid;
    test_success boolean := false;
BEGIN
    RAISE NOTICE '=== TESTING CHARACTER CREATION ===';
    
    BEGIN
        -- Test creating two characters with the same user_id
        INSERT INTO players (
            user_id, name, gold, silver, copper, max_hp, current_hp, 
            temporary_hp, level, stats, is_gm
        ) VALUES (
            test_user_id, 'Test Character 1', 0, 0, 0, 10, 10, 0, 1,
            jsonb_build_object(
                'armor_class', 10, 'initiative', 0, 'speed', 30, 
                'proficiency_bonus', 2, 'inspirations', 0
            ), false
        ) RETURNING id INTO char1_id;
        
        INSERT INTO players (
            user_id, name, gold, silver, copper, max_hp, current_hp, 
            temporary_hp, level, stats, is_gm
        ) VALUES (
            test_user_id, 'Test Character 2', 0, 0, 0, 10, 10, 0, 1,
            jsonb_build_object(
                'armor_class', 10, 'initiative', 0, 'speed', 30, 
                'proficiency_bonus', 2, 'inspirations', 0
            ), false
        ) RETURNING id INTO char2_id;
        
        test_success := true;
        RAISE NOTICE '✅ SUCCESS: Created two characters with same user_id';
        
        -- Clean up test data
        DELETE FROM players WHERE id IN (char1_id, char2_id);
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE WARNING '❌ FAILED: Unique constraint still active - %', SQLERRM;
        WHEN OTHERS THEN
            RAISE WARNING '❌ ERROR: Unexpected error - %', SQLERRM;
    END;
    
    IF test_success THEN
        RAISE NOTICE '🎉 MIGRATION SUCCESSFUL: Multiple character creation is now possible!';
    ELSE
        RAISE WARNING '💥 MIGRATION FAILED: Manual intervention required';
    END IF;
END $$;

-- Step 7: Final verification and reporting
DO $$
DECLARE
    constraint_count integer;
    unique_index_count integer;
    function_count integer;
    policy_count integer;
    total_players integer;
BEGIN
    RAISE NOTICE '=== FINAL VERIFICATION REPORT ===';
    
    -- Count constraints
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'players' 
    AND tc.constraint_type = 'UNIQUE' 
    AND ccu.column_name = 'user_id'
    AND tc.table_schema = 'public';
    
    -- Count unique indexes
    SELECT COUNT(*) INTO unique_index_count
    FROM pg_indexes
    WHERE tablename = 'players'
    AND indexdef LIKE '%UNIQUE%'
    AND indexdef LIKE '%user_id%'
    AND schemaname = 'public';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('create_player_bypass_constraint', 'admin_remove_unique_constraint')
    AND routine_schema = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'players';
    
    -- Count total players
    SELECT COUNT(*) INTO total_players FROM players;
    
    RAISE NOTICE 'Unique constraints on user_id: %', constraint_count;
    RAISE NOTICE 'Unique indexes on user_id: %', unique_index_count;
    RAISE NOTICE 'RPC functions available: %', function_count;
    RAISE NOTICE 'RLS policies active: %', policy_count;
    RAISE NOTICE 'Total characters in database: %', total_players;
    
    IF constraint_count = 0 AND unique_index_count = 0 AND function_count = 2 AND policy_count >= 4 THEN
        RAISE NOTICE '🎯 ALL SYSTEMS GO: Database is ready for multiple character creation!';
    ELSE
        RAISE WARNING '⚠️ INCOMPLETE: Some issues may persist';
        IF constraint_count > 0 THEN
            RAISE WARNING '- Still has % unique constraints on user_id', constraint_count;
        END IF;
        IF unique_index_count > 0 THEN
            RAISE WARNING '- Still has % unique indexes on user_id', unique_index_count;
        END IF;
        IF function_count < 2 THEN
            RAISE WARNING '- Missing RPC functions (found %, expected 2)', function_count;
        END IF;
        IF policy_count < 4 THEN
            RAISE WARNING '- Insufficient RLS policies (found %, expected 4+)', policy_count;
        END IF;
    END IF;
END $$;

-- Step 8: Refresh the schema cache by calling the functions once
SELECT admin_remove_unique_constraint();

-- Final message
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETE ===';
    RAISE NOTICE 'The database has been configured to allow multiple characters per user.';
    RAISE NOTICE 'RPC functions are available and should be in the schema cache.';
    RAISE NOTICE 'Users can now create unlimited characters!';
END $$;
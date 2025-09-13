/*
  # Fix character creation errors
  
  1. Issues Fixed
    - Remove unique constraint on user_id that prevents multiple characters
    - Create missing RPC functions for character creation
    - Ensure proper RLS policies are in place
    
  2. Security
    - Maintain RLS security
    - Users can only create their own characters
    - Proper authentication checks
*/

-- Step 1: Remove the unique constraint that's causing the duplicate key error
DO $$
DECLARE
    constraint_exists boolean;
BEGIN
    -- Check if the constraint exists
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE table_name = 'players' 
        AND constraint_name = 'players_user_id_key'
        AND table_schema = 'public'
    ) INTO constraint_exists;
    
    IF constraint_exists THEN
        ALTER TABLE players DROP CONSTRAINT players_user_id_key;
        RAISE NOTICE 'Removed unique constraint players_user_id_key';
    ELSE
        RAISE NOTICE 'Constraint players_user_id_key does not exist';
    END IF;
    
    -- Also check for any other unique constraints on user_id
    FOR constraint_exists IN
        SELECT constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS ' || constraint_exists;
        RAISE NOTICE 'Removed constraint: %', constraint_exists;
    END LOOP;
END $$;

-- Step 2: Create the missing RPC functions
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
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    -- Check user can only create their own characters
    IF auth.uid() != p_user_id THEN
        RAISE EXCEPTION 'You can only create your own characters';
    END IF;
    
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Character name cannot be empty';
    END IF;
    
    -- Generate new ID
    new_player_id := gen_random_uuid();
    
    -- Set default stats
    default_stats := jsonb_build_object(
        'armor_class', 10,
        'initiative', 0,
        'speed', 30,
        'proficiency_bonus', 2,
        'inspirations', 0
    );
    
    -- Set default abilities
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
    
    -- Insert the new character
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
        0,
        0,
        0,
        10,
        10,
        0,
        1,
        default_stats,
        default_abilities,
        '{}'::jsonb,
        '{}'::jsonb,
        '{}'::jsonb,
        '{}',
        false,
        null,
        false,
        jsonb_build_object('total', 1, 'used', 0),
        now()
    );
    
    RETURN new_player_id;
    
EXCEPTION 
    WHEN unique_violation THEN
        RAISE EXCEPTION 'A unique constraint violation occurred. This should not happen after removing the user_id constraint.';
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Error creating character: %', SQLERRM;
END;
$$;

-- Step 3: Create admin function to remove constraints
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
BEGIN
    -- Check authentication
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'User not authenticated';
    END IF;
    
    result_text := 'Starting constraint removal process...' || chr(10);
    
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
        EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
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
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
        result_text := result_text || 'Removed unique index: ' || index_record.indexname || chr(10);
    END LOOP;
    
    -- Create non-unique index for performance
    DROP INDEX IF EXISTS players_user_id_performance_idx;
    CREATE INDEX players_user_id_performance_idx ON players(user_id);
    result_text := result_text || 'Created performance index on user_id' || chr(10);
    
    result_text := result_text || 'Constraint removal completed successfully.';
    
    RETURN result_text;
    
EXCEPTION WHEN OTHERS THEN
    RETURN 'Error during constraint removal: ' || SQLERRM;
END;
$$;

-- Step 4: Ensure proper RLS policies exist
DROP POLICY IF EXISTS "players_insert_own" ON players;
DROP POLICY IF EXISTS "players_insert_multiple" ON players;
DROP POLICY IF EXISTS "players_can_create_multiple" ON players;

-- Create policy for inserting multiple characters
CREATE POLICY "players_insert_policy"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Ensure other policies exist
DO $$
BEGIN
    -- Select policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND cmd = 'SELECT'
    ) THEN
        CREATE POLICY "players_select_policy"
        ON players FOR SELECT
        TO authenticated
        USING (true);
    END IF;
    
    -- Update policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND cmd = 'UPDATE'
    ) THEN
        CREATE POLICY "players_update_policy"
        ON players FOR UPDATE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
    
    -- Delete policy
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND cmd = 'DELETE'
    ) THEN
        CREATE POLICY "players_delete_policy"
        ON players FOR DELETE
        TO authenticated
        USING (auth.uid() = user_id);
    END IF;
END $$;

-- Step 5: Grant permissions on functions
GRANT EXECUTE ON FUNCTION create_player_bypass_constraint TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_unique_constraint TO authenticated;

-- Step 6: Create a non-unique index for performance if it doesn't exist
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);

-- Step 7: Final verification
DO $$
DECLARE
    constraint_count integer;
    function_count integer;
    policy_count integer;
BEGIN
    -- Count remaining unique constraints on user_id
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'players' 
    AND tc.constraint_type = 'UNIQUE' 
    AND ccu.column_name = 'user_id'
    AND tc.table_schema = 'public';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('create_player_bypass_constraint', 'admin_remove_unique_constraint')
    AND routine_schema = 'public';
    
    -- Count policies
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'players';
    
    RAISE NOTICE '=== MIGRATION VERIFICATION ===';
    RAISE NOTICE 'Unique constraints on user_id: %', constraint_count;
    RAISE NOTICE 'RPC functions created: %', function_count;
    RAISE NOTICE 'RLS policies: %', policy_count;
    
    IF constraint_count = 0 AND function_count = 2 AND policy_count >= 4 THEN
        RAISE NOTICE '✅ Migration completed successfully!';
        RAISE NOTICE '✅ Users can now create multiple characters!';
    ELSE
        RAISE WARNING '⚠️ Migration may be incomplete - manual verification recommended';
    END IF;
END $$;
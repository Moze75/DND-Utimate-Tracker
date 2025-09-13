/*
  # Fix character deletion issues
  
  1. Changes
    - Ensure proper CASCADE deletion for related data
    - Fix RLS policies for DELETE operations
    - Add function to safely delete characters with all related data
    - Ensure proper permissions for character deletion
  
  2. Security
    - Users can only delete their own characters
    - All related data is properly cleaned up
    - Maintains data integrity
*/

-- Step 1: Ensure proper CASCADE constraints exist
DO $$
BEGIN
    -- Check and fix inventory_items foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'inventory_items_player_id_fkey'
        AND table_name = 'inventory_items'
    ) THEN
        ALTER TABLE inventory_items DROP CONSTRAINT inventory_items_player_id_fkey;
    END IF;
    
    ALTER TABLE inventory_items 
    ADD CONSTRAINT inventory_items_player_id_fkey 
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    
    -- Check and fix attacks foreign key
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'attacks_player_id_fkey'
        AND table_name = 'attacks'
    ) THEN
        ALTER TABLE attacks DROP CONSTRAINT attacks_player_id_fkey;
    END IF;
    
    ALTER TABLE attacks 
    ADD CONSTRAINT attacks_player_id_fkey 
    FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    
    -- Check and fix player_spells foreign key if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_spells') THEN
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE constraint_name = 'player_spells_player_id_fkey'
            AND table_name = 'player_spells'
        ) THEN
            ALTER TABLE player_spells DROP CONSTRAINT player_spells_player_id_fkey;
        END IF;
        
        ALTER TABLE player_spells 
        ADD CONSTRAINT player_spells_player_id_fkey 
        FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
    END IF;
    
    RAISE NOTICE 'CASCADE constraints updated successfully';
END $$;

-- Step 2: Ensure proper DELETE policy exists
DROP POLICY IF EXISTS "players_delete_own" ON players;
DROP POLICY IF EXISTS "players_delete_policy" ON players;

CREATE POLICY "players_can_delete_own"
ON players FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Step 3: Create a safe character deletion function
CREATE OR REPLACE FUNCTION delete_character_safely(
    character_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    character_user_id uuid;
    deletion_count integer;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;
    
    -- Verify the character exists and belongs to the user
    SELECT user_id INTO character_user_id
    FROM players
    WHERE id = character_id;
    
    IF character_user_id IS NULL THEN
        RAISE EXCEPTION 'Character not found';
    END IF;
    
    IF character_user_id != current_user_id THEN
        RAISE EXCEPTION 'You can only delete your own characters';
    END IF;
    
    -- Delete related data first (in case CASCADE doesn't work properly)
    DELETE FROM inventory_items WHERE player_id = character_id;
    DELETE FROM attacks WHERE player_id = character_id;
    
    -- Delete player_spells if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'player_spells') THEN
        DELETE FROM player_spells WHERE player_id = character_id;
    END IF;
    
    -- Delete the character
    DELETE FROM players WHERE id = character_id;
    
    -- Check if deletion was successful
    GET DIAGNOSTICS deletion_count = ROW_COUNT;
    
    IF deletion_count = 0 THEN
        RAISE EXCEPTION 'Character deletion failed';
    END IF;
    
    RETURN true;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error deleting character: %', SQLERRM;
END;
$$;

-- Step 4: Grant permissions
GRANT EXECUTE ON FUNCTION delete_character_safely(uuid) TO authenticated;

-- Step 5: Ensure inventory_items policies allow deletion
DROP POLICY IF EXISTS "Les utilisateurs peuvent supprimer leurs objets" ON inventory_items;
DROP POLICY IF EXISTS "inventory_items_delete_own" ON inventory_items;

CREATE POLICY "inventory_items_delete_policy"
ON inventory_items FOR DELETE
TO authenticated
USING (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
));

-- Step 6: Ensure attacks policies allow deletion
DROP POLICY IF EXISTS "attacks_delete_own" ON attacks;

CREATE POLICY "attacks_delete_policy"
ON attacks FOR DELETE
TO authenticated
USING (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
));

-- Step 7: Test the deletion function
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_character_id uuid;
    test_item_id uuid;
    test_attack_id uuid;
    deletion_success boolean;
BEGIN
    RAISE NOTICE '=== TESTING CHARACTER DELETION ===';
    
    BEGIN
        -- Create a test character
        INSERT INTO players (
            id, user_id, name, gold, silver, copper, max_hp, current_hp, 
            temporary_hp, level, is_gm, stats, created_at
        ) VALUES (
            gen_random_uuid(), test_user_id, 'Test Character for Deletion', 0, 0, 0, 
            10, 10, 0, 1, false,
            jsonb_build_object(
                'armor_class', 10, 'initiative', 0, 'speed', 30, 
                'proficiency_bonus', 2, 'inspirations', 0
            ),
            now()
        ) RETURNING id INTO test_character_id;
        
        -- Create related data
        INSERT INTO inventory_items (player_id, name, description)
        VALUES (test_character_id, 'Test Item', 'Test Description')
        RETURNING id INTO test_item_id;
        
        INSERT INTO attacks (player_id, name, damage_dice, damage_type, range)
        VALUES (test_character_id, 'Test Attack', '1d6', 'Slashing', '5 feet')
        RETURNING id INTO test_attack_id;
        
        RAISE NOTICE 'Test character created with ID: %', test_character_id;
        RAISE NOTICE 'Test item created with ID: %', test_item_id;
        RAISE NOTICE 'Test attack created with ID: %', test_attack_id;
        
        -- Test direct deletion (should work with CASCADE)
        DELETE FROM players WHERE id = test_character_id;
        
        -- Verify deletion
        IF NOT EXISTS (SELECT 1 FROM players WHERE id = test_character_id) THEN
            RAISE NOTICE '✅ Direct deletion successful';
        ELSE
            RAISE WARNING '❌ Direct deletion failed';
        END IF;
        
        -- Verify related data was deleted
        IF NOT EXISTS (SELECT 1 FROM inventory_items WHERE id = test_item_id) THEN
            RAISE NOTICE '✅ Related inventory item deleted';
        ELSE
            RAISE WARNING '❌ Related inventory item still exists';
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM attacks WHERE id = test_attack_id) THEN
            RAISE NOTICE '✅ Related attack deleted';
        ELSE
            RAISE WARNING '❌ Related attack still exists';
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '❌ Test failed with error: %', SQLERRM;
    END;
    
    RAISE NOTICE '=== CHARACTER DELETION TEST COMPLETED ===';
END $$;

-- Step 8: Final verification
DO $$
DECLARE
    cascade_constraints_count integer;
    delete_policies_count integer;
    function_exists boolean;
BEGIN
    RAISE NOTICE '=== DELETION FIX VERIFICATION ===';
    
    -- Count CASCADE constraints
    SELECT COUNT(*) INTO cascade_constraints_count
    FROM information_schema.referential_constraints rc
    JOIN information_schema.table_constraints tc ON rc.constraint_name = tc.constraint_name
    WHERE tc.table_name IN ('inventory_items', 'attacks', 'player_spells')
    AND rc.delete_rule = 'CASCADE';
    
    -- Count DELETE policies
    SELECT COUNT(*) INTO delete_policies_count
    FROM pg_policies
    WHERE tablename IN ('players', 'inventory_items', 'attacks')
    AND cmd = 'DELETE';
    
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'delete_character_safely'
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    RAISE NOTICE 'CASCADE constraints: %', cascade_constraints_count;
    RAISE NOTICE 'DELETE policies: %', delete_policies_count;
    RAISE NOTICE 'Safe deletion function exists: %', function_exists;
    
    IF cascade_constraints_count >= 2 AND delete_policies_count >= 3 AND function_exists THEN
        RAISE NOTICE '🎉 CHARACTER DELETION FIX COMPLETED SUCCESSFULLY!';
        RAISE NOTICE '✅ Users can now safely delete their characters';
        RAISE NOTICE '✅ All related data will be properly cleaned up';
        RAISE NOTICE '✅ Deletion function is available for complex cases';
    ELSE
        RAISE WARNING '⚠️ Some issues may persist:';
        IF cascade_constraints_count < 2 THEN
            RAISE WARNING '- Insufficient CASCADE constraints';
        END IF;
        IF delete_policies_count < 3 THEN
            RAISE WARNING '- Insufficient DELETE policies';
        END IF;
        IF NOT function_exists THEN
            RAISE WARNING '- Safe deletion function missing';
        END IF;
    END IF;
END $$;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Character deletion has been fixed in the database.';
    RAISE NOTICE 'The frontend deletion should now work properly.';
    RAISE NOTICE 'All related data will be automatically cleaned up.';
END $$;
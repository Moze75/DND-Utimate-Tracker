/*
  # Remove unique constraint on user_id to allow multiple characters per user
  
  1. Changes
    - Forcefully remove any unique constraint on user_id column in players table
    - Use dynamic SQL to handle different constraint names
    - Ensure users can create multiple characters
    
  2. Security
    - Maintains all existing RLS policies
    - Preserves foreign key relationship to auth.users
*/

-- Remove any unique constraint on user_id using dynamic SQL
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find all unique constraints on the user_id column
    FOR constraint_name IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        -- Drop each unique constraint found
        EXECUTE 'ALTER TABLE players DROP CONSTRAINT ' || constraint_name;
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
    
    -- Also check for any index-based unique constraints
    FOR constraint_name IN
        SELECT indexname
        FROM pg_indexes
        WHERE tablename = 'players'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%user_id%'
        AND schemaname = 'public'
    LOOP
        -- Drop unique indexes on user_id
        EXECUTE 'DROP INDEX IF EXISTS ' || constraint_name;
        RAISE NOTICE 'Dropped unique index: %', constraint_name;
    END LOOP;
END $$;

-- Verify the constraint is gone by attempting to create a test scenario
-- This will help confirm the fix worked
DO $$
BEGIN
    -- Check if we can theoretically insert duplicate user_ids
    -- (This is just a validation check, no actual data is inserted)
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    ) THEN
        RAISE NOTICE 'SUCCESS: No unique constraint found on user_id column';
    ELSE
        RAISE WARNING 'WARNING: Unique constraint still exists on user_id column';
    END IF;
END $$;
/*
  # Fix unique constraint on user_id in players table
  
  1. Changes
    - Ensure the unique constraint on user_id is completely removed
    - This allows users to create multiple characters
    
  2. Security
    - Maintains all existing RLS policies
    - Preserves foreign key relationship to auth.users
*/

-- Remove the unique constraint on user_id if it still exists
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key;

-- Also remove any other potential unique constraints on user_id
DO $$
BEGIN
    -- Check if there are any unique constraints on user_id and remove them
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
    ) THEN
        -- Get the constraint name and drop it
        EXECUTE (
            SELECT 'ALTER TABLE players DROP CONSTRAINT ' || tc.constraint_name
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
            WHERE tc.table_name = 'players' 
            AND tc.constraint_type = 'UNIQUE' 
            AND ccu.column_name = 'user_id'
            LIMIT 1
        );
    END IF;
END $$;
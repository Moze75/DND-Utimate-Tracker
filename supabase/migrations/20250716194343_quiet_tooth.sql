/*
  # Add missing subclass column to players table
  
  1. Changes
    - Add subclass column to players table if it doesn't exist
    - Set default value to NULL to allow existing records to remain valid
    
  2. Security
    - Maintain all existing RLS policies
    - No changes to authentication or permissions
*/

-- Add the missing subclass column
ALTER TABLE players ADD COLUMN IF NOT EXISTS subclass text DEFAULT NULL;

-- Verify the column was added
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'subclass'
        AND table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ Column "subclass" added successfully to players table';
    ELSE
        RAISE WARNING '⚠️ Failed to add "subclass" column to players table';
    END IF;
END $$;
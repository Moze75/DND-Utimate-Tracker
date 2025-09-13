/*
  # Add active conditions tracking
  
  1. Changes
    - Add active_conditions column to players table
    - Column stores array of condition IDs
    - Default value is empty array
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS active_conditions text[] DEFAULT '{}';

-- Update existing players to have empty conditions array
UPDATE players
SET active_conditions = '{}'
WHERE active_conditions IS NULL;
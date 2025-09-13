/*
  # Add hit dice tracking
  
  1. Changes
    - Add hit_dice column to players table
    - Initialize hit dice based on player level
    - Column stores total and used hit dice as JSONB
    
  2. Notes
    - Default value is empty JSONB object
    - Update sets total to current level and used to 0
*/

-- Add the hit_dice column with a default empty JSONB object
ALTER TABLE players
ADD COLUMN IF NOT EXISTS hit_dice jsonb DEFAULT '{}'::jsonb;

-- Update existing players to set their hit dice based on level
UPDATE players
SET hit_dice = jsonb_build_object(
  'total', level,
  'used', 0
)
WHERE hit_dice = '{}'::jsonb OR hit_dice IS NULL;
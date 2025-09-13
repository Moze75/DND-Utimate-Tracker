/*
  # Update attacks system
  
  1. Changes
    - Remove attack_bonus column since it will be calculated automatically
    - Add expertise column for expertise bonus
*/

-- Remove attack_bonus column
ALTER TABLE attacks
DROP COLUMN attack_bonus;

-- Add expertise column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'attacks' AND column_name = 'expertise'
  ) THEN
    ALTER TABLE attacks ADD COLUMN expertise boolean DEFAULT false;
  END IF;
END $$;
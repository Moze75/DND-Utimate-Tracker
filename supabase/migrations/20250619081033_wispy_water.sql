/*
  # Add attack_type and spell_level columns to attacks table

  1. Schema Changes
    - Add `attack_type` column to `attacks` table (text, defaults to 'physical')
    - Add `spell_level` column to `attacks` table (integer, nullable)

  2. Data Migration
    - Set default values for existing records
    - Physical attacks get 'physical' type
    - Spell-like attacks (based on damage type) get 'spell' type with appropriate level

  3. Notes
    - This migration adds support for distinguishing between physical attacks and spells
    - Existing attacks will be automatically categorized based on their damage type
    - The spell_level column allows tracking of spell levels for magical attacks
*/

-- Add the new columns to the attacks table
DO $$
BEGIN
  -- Add attack_type column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attacks' AND column_name = 'attack_type'
  ) THEN
    ALTER TABLE attacks ADD COLUMN attack_type text DEFAULT 'physical';
  END IF;

  -- Add spell_level column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'attacks' AND column_name = 'spell_level'
  ) THEN
    ALTER TABLE attacks ADD COLUMN spell_level integer;
  END IF;
END $$;

-- Update existing records to categorize them appropriately
-- Attacks with magical damage types are likely spells
UPDATE attacks 
SET attack_type = 'spell', spell_level = 1
WHERE attack_type = 'physical' 
  AND damage_type IN ('Force', 'Nécrotique', 'Psychique', 'Radiant', 'Tonnerre', 'Feu', 'Froid', 'Foudre', 'Acide', 'Poison');

-- Add check constraint to ensure attack_type is valid
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'attacks_attack_type_check'
  ) THEN
    ALTER TABLE attacks ADD CONSTRAINT attacks_attack_type_check 
    CHECK (attack_type IN ('physical', 'spell'));
  END IF;
END $$;

-- Add check constraint for spell_level (0-9 for D&D spells)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name = 'attacks_spell_level_check'
  ) THEN
    ALTER TABLE attacks ADD CONSTRAINT attacks_spell_level_check 
    CHECK (spell_level IS NULL OR (spell_level >= 0 AND spell_level <= 9));
  END IF;
END $$;
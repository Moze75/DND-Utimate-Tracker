/*
  # Add equipment column to players table

  1. Changes
    - Add `equipment` column to `players` table
      - Type: `jsonb`
      - Nullable: true
      - Default: empty JSON object

  2. Purpose
    - Allow storing player equipment data in a structured JSON format
    - Support armor, weapons, shields, and potions
*/

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'players' AND column_name = 'equipment'
  ) THEN
    ALTER TABLE players 
    ADD COLUMN equipment jsonb DEFAULT '{}'::jsonb;
  END IF;
END $$;
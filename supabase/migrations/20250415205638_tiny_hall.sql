/*
  # Add concentration tracking
  
  1. Changes
    - Add is_concentrating boolean column
    - Add concentration_spell text column
    - Default values set to false and null respectively
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_concentrating boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS concentration_spell text DEFAULT NULL;
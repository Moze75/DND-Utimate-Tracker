/*
  # Add avatar zoom support
  
  1. Changes
    - Add `avatar_zoom` column to `players` table with default value of 1
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS avatar_zoom numeric DEFAULT 1;
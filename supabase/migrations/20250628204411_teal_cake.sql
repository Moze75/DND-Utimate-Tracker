/*
  # Remove unique constraint on user_id to allow multiple characters per user
  
  1. Changes
    - Drop the unique constraint on user_id column in players table
    - This allows a single user to create multiple character profiles
    
  2. Security
    - Maintains foreign key relationship to auth.users
    - Preserves all existing RLS policies
*/

-- Remove the unique constraint on user_id
ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key;
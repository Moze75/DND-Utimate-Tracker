/*
  # Update player visibility policies
  
  1. Changes
    - Drop existing policies
    - Create new policies that allow players to:
      - See all players' basic info and abilities
      - Only modify their own data
    - Maintain security for sensitive operations
*/

-- Drop existing policies
DROP POLICY IF EXISTS "auth_users_select" ON players;
DROP POLICY IF EXISTS "auth_users_update" ON players;
DROP POLICY IF EXISTS "auth_users_insert" ON players;

-- Create new policies
CREATE POLICY "players_select_all"
ON players FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "players_update_own"
ON players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "players_insert_own"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
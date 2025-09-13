/*
  # Fix authentication policies
  
  1. Changes
    - Drop existing policies
    - Create new policies for authenticated users
    - Ensure proper access control
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur profil" ON players;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur profil" ON players;
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur profil" ON players;

-- Create new policies
CREATE POLICY "auth_users_select"
ON players FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "auth_users_update"
ON players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "auth_users_insert"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
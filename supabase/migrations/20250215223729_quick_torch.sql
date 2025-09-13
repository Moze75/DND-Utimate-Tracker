/*
  # Fix RLS policies for group treasury

  1. Changes
    - Drop existing policies
    - Add new policies for authenticated users
    - Ensure proper access to group treasury
*/

-- Supprime les politiques existantes pour group_treasury
DROP POLICY IF EXISTS "Tout le monde peut voir le trésor du groupe" ON group_treasury;
DROP POLICY IF EXISTS "Tout le monde peut modifier le trésor du groupe" ON group_treasury;

-- Nouvelles politiques pour group_treasury
CREATE POLICY "Les utilisateurs authentifiés peuvent voir le trésor"
  ON group_treasury
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent modifier le trésor"
  ON group_treasury
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Les utilisateurs authentifiés peuvent mettre à jour le trésor"
  ON group_treasury
  FOR UPDATE
  TO authenticated
  USING (true);

-- Réinsère l'enregistrement initial
DELETE FROM group_treasury;
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO UPDATE
SET gold = EXCLUDED.gold,
    silver = EXCLUDED.silver,
    copper = EXCLUDED.copper;
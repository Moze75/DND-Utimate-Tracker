/*
  # Fix group treasury table and policies

  1. Changes
    - Reset group treasury table
    - Add proper RLS policies
    - Ensure initial record exists
*/

-- Réinitialisation complète
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir le trésor" ON group_treasury;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent modifier le trésor" ON group_treasury;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour le trésor" ON group_treasury;

-- Désactive temporairement RLS pour permettre la réinitialisation
ALTER TABLE group_treasury DISABLE ROW LEVEL SECURITY;

-- Supprime tous les enregistrements
TRUNCATE TABLE group_treasury;

-- Réactive RLS
ALTER TABLE group_treasury ENABLE ROW LEVEL SECURITY;

-- Crée une politique unique qui permet toutes les opérations
CREATE POLICY "Accès complet pour les utilisateurs authentifiés"
  ON group_treasury
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Insère l'enregistrement initial
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO UPDATE
SET gold = 0,
    silver = 0,
    copper = 0;
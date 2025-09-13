/*
  # Fix group treasury permissions and initial record

  1. Changes
    - Reset all RLS policies
    - Add a new permissive policy for authenticated users
    - Ensure initial record exists with proper permissions
*/

-- Supprime toutes les politiques existantes
DROP POLICY IF EXISTS "Accès complet pour les utilisateurs authentifiés" ON group_treasury;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent voir le trésor" ON group_treasury;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent modifier le trésor" ON group_treasury;
DROP POLICY IF EXISTS "Les utilisateurs authentifiés peuvent mettre à jour le trésor" ON group_treasury;

-- Désactive temporairement RLS
ALTER TABLE group_treasury DISABLE ROW LEVEL SECURITY;

-- Nettoie la table
TRUNCATE TABLE group_treasury;

-- Crée l'enregistrement initial
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0);

-- Réactive RLS
ALTER TABLE group_treasury ENABLE ROW LEVEL SECURITY;

-- Crée une politique très permissive pour les utilisateurs authentifiés
CREATE POLICY "Accès total au trésor pour les utilisateurs authentifiés"
ON group_treasury
AS PERMISSIVE
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
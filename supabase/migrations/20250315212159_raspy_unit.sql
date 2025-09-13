/*
  # Définition du rôle MJ pour le joueur existant
  
  1. Modifications
    - Met à jour le joueur existant pour lui donner le rôle de MJ
    
  2. Notes
    - Cette migration est idempotente (peut être exécutée plusieurs fois sans effet secondaire)
*/

-- Met à jour le premier joueur créé comme MJ
UPDATE players
SET is_gm = true
WHERE id = (
  SELECT id
  FROM players
  ORDER BY created_at ASC
  LIMIT 1
);

-- Assure que les politiques sont correctement définies
DROP POLICY IF EXISTS "Les MJs peuvent modifier le trésor" ON group_treasury;
DROP POLICY IF EXISTS "Tout le monde peut voir le trésor" ON group_treasury;

-- Recrée les politiques avec les bonnes permissions
CREATE POLICY "Les MJs peuvent modifier le trésor"
ON group_treasury
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM players
  WHERE user_id = auth.uid()
  AND is_gm = true
))
WITH CHECK (EXISTS (
  SELECT 1 FROM players
  WHERE user_id = auth.uid()
  AND is_gm = true
));

CREATE POLICY "Tout le monde peut voir le trésor"
ON group_treasury
FOR SELECT
TO authenticated
USING (true);
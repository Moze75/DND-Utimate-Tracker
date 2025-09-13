/*
  # Ajout du rôle de maître du jeu
  
  1. Modifications
    - Ajout de la colonne `is_gm` à la table `players`
    - Valeur par défaut : false
    
  2. Sécurité
    - Seuls les MJs peuvent modifier le trésor du groupe
*/

-- Ajout de la colonne is_gm
ALTER TABLE players
ADD COLUMN IF NOT EXISTS is_gm boolean DEFAULT false;

-- Mise à jour des politiques pour le trésor du groupe
DROP POLICY IF EXISTS "Accès total au trésor pour les utilisateurs authentifiés" ON group_treasury;

-- Seuls les MJs peuvent modifier le trésor
CREATE POLICY "Les MJs peuvent modifier le trésor"
ON group_treasury
FOR UPDATE
TO authenticated
USING (EXISTS (
  SELECT 1 FROM players
  WHERE user_id = auth.uid()
  AND is_gm = true
));

-- Tout le monde peut voir le trésor
CREATE POLICY "Tout le monde peut voir le trésor"
ON group_treasury
FOR SELECT
TO authenticated
USING (true);
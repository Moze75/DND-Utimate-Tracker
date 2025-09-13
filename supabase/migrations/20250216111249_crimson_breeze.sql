/*
  # Ajout de la contrainte user_id pour l'authentification

  1. Modifications
    - Ajout de la contrainte de clé étrangère pour user_id
    - Ajout de l'unicité sur user_id
    - Mise à jour des politiques RLS pour l'authentification
*/

-- Ajout de la contrainte de clé étrangère
ALTER TABLE players
ADD CONSTRAINT players_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES auth.users (id)
ON DELETE CASCADE;

-- Ajout de l'unicité sur user_id
ALTER TABLE players
ADD CONSTRAINT players_user_id_key
UNIQUE (user_id);

-- Mise à jour des politiques RLS
DROP POLICY IF EXISTS "Accès public aux joueurs" ON players;
DROP POLICY IF EXISTS "Accès public à l'inventaire" ON inventory_items;

-- Nouvelles politiques pour les joueurs
CREATE POLICY "Les utilisateurs peuvent voir leur profil"
ON players FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leur profil"
ON players FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent créer leur profil"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Nouvelles politiques pour l'inventaire
CREATE POLICY "Les utilisateurs peuvent voir leurs objets"
ON inventory_items FOR SELECT
TO authenticated
USING (player_id IN (
  SELECT id FROM players WHERE user_id = auth.uid()
));

CREATE POLICY "Les utilisateurs peuvent ajouter des objets"
ON inventory_items FOR INSERT
TO authenticated
WITH CHECK (player_id IN (
  SELECT id FROM players WHERE user_id = auth.uid()
));

CREATE POLICY "Les utilisateurs peuvent supprimer leurs objets"
ON inventory_items FOR DELETE
TO authenticated
USING (player_id IN (
  SELECT id FROM players WHERE user_id = auth.uid()
));
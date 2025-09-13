/*
  # Mise à jour des politiques de sécurité pour l'accès public

  1. Modifications
    - Désactivation des politiques existantes
    - Création de nouvelles politiques pour l'accès public
    - Mise à jour des tables pour permettre l'accès anonyme

  2. Tables concernées
    - players
    - inventory_items
    - group_treasury

  3. Sécurité
    - Accès en lecture/écriture pour tous
    - Maintien des contraintes de base de données
*/

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS "Les utilisateurs peuvent créer leur profil" ON players;
DROP POLICY IF EXISTS "Les utilisateurs peuvent voir leur profil" ON players;
DROP POLICY IF EXISTS "Les utilisateurs peuvent modifier leur profil" ON players;
DROP POLICY IF EXISTS "Les joueurs peuvent voir leurs objets" ON inventory_items;
DROP POLICY IF EXISTS "Les joueurs peuvent ajouter des objets" ON inventory_items;
DROP POLICY IF EXISTS "Les joueurs peuvent supprimer leurs objets" ON inventory_items;
DROP POLICY IF EXISTS "Accès total au trésor pour les utilisateurs authentifiés" ON group_treasury;

-- Nouvelles politiques pour l'accès public
CREATE POLICY "Accès public aux joueurs"
ON players FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Accès public à l'inventaire"
ON inventory_items FOR ALL
USING (true)
WITH CHECK (true);

CREATE POLICY "Accès public au trésor"
ON group_treasury FOR ALL
USING (true)
WITH CHECK (true);

-- Réinitialisation du trésor du groupe
DELETE FROM group_treasury;
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES ('00000000-0000-0000-0000-000000000001', 0, 0, 0)
ON CONFLICT (id) DO UPDATE
SET gold = 0,
    silver = 0,
    copper = 0;
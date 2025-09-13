/*
  # Correction des politiques RLS pour la table players

  1. Modifications
    - Ajout d'une politique permettant l'insertion de nouveaux joueurs
    - Mise à jour des politiques existantes pour une meilleure clarté

  2. Sécurité
    - Les utilisateurs peuvent créer leur propre profil
    - Les utilisateurs peuvent uniquement voir et modifier leur propre profil
*/

-- Suppression des anciennes politiques
DROP POLICY IF EXISTS "Les joueurs peuvent voir leur profil" ON players;
DROP POLICY IF EXISTS "Les joueurs peuvent modifier leur profil" ON players;

-- Nouvelles politiques
CREATE POLICY "Les utilisateurs peuvent créer leur profil"
  ON players
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent voir leur profil"
  ON players
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les utilisateurs peuvent modifier leur profil"
  ON players
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);
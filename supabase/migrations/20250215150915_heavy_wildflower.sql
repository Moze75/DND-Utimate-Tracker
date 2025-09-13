/*
  # Schéma initial pour le gestionnaire D&D

  1. Tables
    - `players` : Informations des joueurs
      - `id` (uuid, clé primaire)
      - `user_id` (uuid, lié à auth.users)
      - `name` (text)
      - `gold` (integer)
      - `silver` (integer)
      - `copper` (integer)
      
    - `inventory_items` : Objets dans l'inventaire
      - `id` (uuid, clé primaire)
      - `player_id` (uuid, référence players)
      - `name` (text)
      - `description` (text)

    - `group_treasury` : Trésor du groupe
      - `id` (uuid, clé primaire)
      - `gold` (integer)
      - `silver` (integer)
      - `copper` (integer)

  2. Sécurité
    - RLS activé sur toutes les tables
    - Politiques pour que les joueurs ne voient que leurs données
    - Politique spéciale pour le trésor du groupe (visible par tous)
*/

-- Table des joueurs
CREATE TABLE players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  gold integer DEFAULT 0,
  silver integer DEFAULT 0,
  copper integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Table des objets d'inventaire
CREATE TABLE inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid REFERENCES players NOT NULL,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Table du trésor du groupe
CREATE TABLE group_treasury (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gold integer DEFAULT 0,
  silver integer DEFAULT 0,
  copper integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Insertion d'un trésor de groupe initial
INSERT INTO group_treasury (id, gold, silver, copper)
VALUES (gen_random_uuid(), 0, 0, 0);

-- Activation de la sécurité niveau ligne
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_treasury ENABLE ROW LEVEL SECURITY;

-- Politiques pour les joueurs
CREATE POLICY "Les joueurs peuvent voir leur profil"
  ON players
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Les joueurs peuvent modifier leur profil"
  ON players
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Politiques pour l'inventaire
CREATE POLICY "Les joueurs peuvent voir leurs objets"
  ON inventory_items
  FOR SELECT
  TO authenticated
  USING (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ));

CREATE POLICY "Les joueurs peuvent ajouter des objets"
  ON inventory_items
  FOR INSERT
  TO authenticated
  WITH CHECK (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ));

CREATE POLICY "Les joueurs peuvent supprimer leurs objets"
  ON inventory_items
  FOR DELETE
  TO authenticated
  USING (player_id IN (
    SELECT id FROM players WHERE user_id = auth.uid()
  ));

-- Politiques pour le trésor du groupe
CREATE POLICY "Tout le monde peut voir le trésor du groupe"
  ON group_treasury
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Tout le monde peut modifier le trésor du groupe"
  ON group_treasury
  FOR UPDATE
  TO authenticated
  USING (true);
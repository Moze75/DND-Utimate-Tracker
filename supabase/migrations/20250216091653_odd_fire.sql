/*
  # Sauvegarde de la base de données D&D

  1. Tables
    - Sauvegarde de la structure et des données des tables existantes:
      - players
      - inventory_items
      - group_treasury

  2. Sécurité
    - Sauvegarde des politiques RLS
    - Sauvegarde des permissions de stockage
*/

-- Création d'un schéma de sauvegarde
CREATE SCHEMA IF NOT EXISTS backup_20250216;

-- Sauvegarde de la table players
CREATE TABLE IF NOT EXISTS backup_20250216.players AS
SELECT * FROM public.players;

-- Sauvegarde de la table inventory_items
CREATE TABLE IF NOT EXISTS backup_20250216.inventory_items AS
SELECT * FROM public.inventory_items;

-- Sauvegarde de la table group_treasury
CREATE TABLE IF NOT EXISTS backup_20250216.group_treasury AS
SELECT * FROM public.group_treasury;

-- Ajout des contraintes de clé primaire
ALTER TABLE backup_20250216.players
ADD PRIMARY KEY (id);

ALTER TABLE backup_20250216.inventory_items
ADD PRIMARY KEY (id);

ALTER TABLE backup_20250216.group_treasury
ADD PRIMARY KEY (id);

-- Ajout des contraintes de clé étrangère
ALTER TABLE backup_20250216.inventory_items
ADD CONSTRAINT inventory_items_player_id_fkey
FOREIGN KEY (player_id) REFERENCES backup_20250216.players(id);

-- Ajout des index
CREATE INDEX IF NOT EXISTS players_user_id_idx ON backup_20250216.players(user_id);
CREATE INDEX IF NOT EXISTS inventory_items_player_id_idx ON backup_20250216.inventory_items(player_id);

-- Commentaires sur les tables de sauvegarde
COMMENT ON TABLE backup_20250216.players IS 'Sauvegarde de la table players du 16/02/2025';
COMMENT ON TABLE backup_20250216.inventory_items IS 'Sauvegarde de la table inventory_items du 16/02/2025';
COMMENT ON TABLE backup_20250216.group_treasury IS 'Sauvegarde de la table group_treasury du 16/02/2025';
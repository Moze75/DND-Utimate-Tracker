/*
  # Suppression de la contrainte user_id

  1. Modifications
    - Suppression de la contrainte user_id NOT NULL
    - Suppression de la référence à auth.users
    - Mise à jour de la structure de la table players

  2. Changements
    - La colonne user_id devient optionnelle
    - Suppression de la contrainte de clé étrangère
*/

-- Supprime d'abord la contrainte de clé étrangère
ALTER TABLE players
DROP CONSTRAINT IF EXISTS players_user_id_fkey;

-- Rend la colonne user_id nullable
ALTER TABLE players
ALTER COLUMN user_id DROP NOT NULL;

-- Supprime l'unicité sur user_id
ALTER TABLE players
DROP CONSTRAINT IF EXISTS players_user_id_key;
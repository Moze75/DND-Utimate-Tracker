/*
  # Ajout des points de vie et des emplacements de sorts

  1. Modifications
    - Ajout des colonnes pour les points de vie
      - `max_hp` (integer)
      - `current_hp` (integer)
      - `temporary_hp` (integer)
    - Mise à jour des emplacements de sorts
      - Ajout des colonnes pour les emplacements utilisés
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS max_hp integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS current_hp integer DEFAULT 10,
ADD COLUMN IF NOT EXISTS temporary_hp integer DEFAULT 0;
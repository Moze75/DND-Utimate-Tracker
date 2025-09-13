/*
  # Ajout des champs de profil joueur D&D

  1. Modifications
    - Ajout des champs au tableau `players`:
      - `adventurer_name` (nom d'aventurier)
      - `avatar_url` (URL de l'avatar)
      - `class` (classe D&D)
      - `level` (niveau)
      - `spell_slots` (emplacements de sorts)
      - `ki_points` (points de ki pour les moines)

  2. Notes
    - Les emplacements de sorts sont stockés en JSON pour flexibilité
    - Les points de ki sont calculés en fonction du niveau pour les moines
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS adventurer_name text,
ADD COLUMN IF NOT EXISTS avatar_url text,
ADD COLUMN IF NOT EXISTS class text,
ADD COLUMN IF NOT EXISTS level integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS spell_slots jsonb DEFAULT '{}',
ADD COLUMN IF NOT EXISTS ki_points integer DEFAULT 0;
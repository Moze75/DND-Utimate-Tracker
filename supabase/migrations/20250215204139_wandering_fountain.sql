/*
  # Ajout de la position de l'avatar

  1. Modifications
    - Ajout de la colonne `avatar_position` à la table `players`
      - Type JSONB pour stocker les coordonnées x et y
      - Valeur par défaut : { x: 0, y: 0 }
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS avatar_position jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb;
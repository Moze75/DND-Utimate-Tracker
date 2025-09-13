/*
  # Ajout de la colonne abilities

  1. Modifications
    - Ajout de la colonne `abilities` de type jsonb à la table `players`
    - Initialisation avec un tableau vide par défaut
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS abilities jsonb DEFAULT jsonb_build_array();
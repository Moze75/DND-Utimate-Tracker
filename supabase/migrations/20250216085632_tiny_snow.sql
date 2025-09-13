/*
  # Ajout des emplacements de sorts

  1. Modifications
    - Ajout d'une colonne spell_slots pour stocker les emplacements de sorts
    - Initialisation avec un objet JSON vide par défaut
*/

-- Ajout de la colonne spell_slots si elle n'existe pas déjà
ALTER TABLE players
ADD COLUMN IF NOT EXISTS spell_slots jsonb DEFAULT jsonb_build_object(
  'level1', 0, 'used1', 0,
  'level2', 0, 'used2', 0,
  'level3', 0, 'used3', 0,
  'level4', 0, 'used4', 0,
  'level5', 0, 'used5', 0,
  'level6', 0, 'used6', 0,
  'level7', 0, 'used7', 0,
  'level8', 0, 'used8', 0,
  'level9', 0, 'used9', 0
);
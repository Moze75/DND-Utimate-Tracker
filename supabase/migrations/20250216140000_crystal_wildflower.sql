/*
  # Ajout de la colonne abilities

  1. Modifications
    - Ajout d'une colonne JSONB 'abilities' à la table 'players'
    - Cette colonne stockera les caractéristiques et compétences des personnages
*/

ALTER TABLE players
ADD COLUMN IF NOT EXISTS abilities jsonb DEFAULT jsonb_build_object();

-- Met à jour les joueurs existants avec une structure par défaut
UPDATE players
SET abilities = jsonb_build_array(
  jsonb_build_object(
    'name', 'Force',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array(
      jsonb_build_object('name', 'Athlétisme', 'bonus', 0, 'isProficient', false)
    )
  ),
  jsonb_build_object(
    'name', 'Dextérité',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array(
      jsonb_build_object('name', 'Acrobaties', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Discrétion', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Escamotage', 'bonus', 0, 'isProficient', false)
    )
  ),
  jsonb_build_object(
    'name', 'Constitution',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array()
  ),
  jsonb_build_object(
    'name', 'Intelligence',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array(
      jsonb_build_object('name', 'Arcanes', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Histoire', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Investigation', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Nature', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Religion', 'bonus', 0, 'isProficient', false)
    )
  ),
  jsonb_build_object(
    'name', 'Sagesse',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array(
      jsonb_build_object('name', 'Dressage', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Médecine', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Perception', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Perspicacité', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Survie', 'bonus', 0, 'isProficient', false)
    )
  ),
  jsonb_build_object(
    'name', 'Charisme',
    'score', 10,
    'modifier', 0,
    'savingThrow', 0,
    'skills', jsonb_build_array(
      jsonb_build_object('name', 'Intimidation', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Persuasion', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Représentation', 'bonus', 0, 'isProficient', false),
      jsonb_build_object('name', 'Tromperie', 'bonus', 0, 'isProficient', false)
    )
  )
)
WHERE abilities IS NULL;
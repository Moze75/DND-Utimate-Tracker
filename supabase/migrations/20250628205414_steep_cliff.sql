/*
  # Fonctions de contournement pour la création de personnages
  
  1. Fonctions
    - create_player_bypass_constraint: Crée un personnage en contournant les contraintes
    - admin_remove_unique_constraint: Supprime définitivement les contraintes uniques
    
  2. Sécurité
    - Fonctions sécurisées avec SECURITY DEFINER
    - Vérifications d'authentification
*/

-- Fonction pour créer un personnage en contournant les contraintes
CREATE OR REPLACE FUNCTION create_player_bypass_constraint(
  p_user_id uuid,
  p_name text,
  p_adventurer_name text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_player_id uuid;
  default_stats jsonb;
  default_abilities jsonb;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Vérifier que l'utilisateur crée son propre personnage
  IF auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'Vous ne pouvez créer que vos propres personnages';
  END IF;
  
  -- Générer un ID unique
  new_player_id := gen_random_uuid();
  
  -- Préparer les données par défaut
  default_stats := jsonb_build_object(
    'armor_class', 10,
    'initiative', 0,
    'speed', 30,
    'proficiency_bonus', 2,
    'inspirations', 0
  );
  
  default_abilities := jsonb_build_array(
    jsonb_build_object(
      'name', 'Force',
      'score', 10,
      'modifier', 0,
      'savingThrow', 0,
      'skills', jsonb_build_array(
        jsonb_build_object('name', 'Athlétisme', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
      )
    ),
    jsonb_build_object(
      'name', 'Dextérité',
      'score', 10,
      'modifier', 0,
      'savingThrow', 0,
      'skills', jsonb_build_array(
        jsonb_build_object('name', 'Acrobaties', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Discrétion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Escamotage', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
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
        jsonb_build_object('name', 'Arcanes', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Histoire', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Investigation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Nature', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Religion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
      )
    ),
    jsonb_build_object(
      'name', 'Sagesse',
      'score', 10,
      'modifier', 0,
      'savingThrow', 0,
      'skills', jsonb_build_array(
        jsonb_build_object('name', 'Dressage', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Médecine', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Perception', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Perspicacité', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Survie', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
      )
    ),
    jsonb_build_object(
      'name', 'Charisme',
      'score', 10,
      'modifier', 0,
      'savingThrow', 0,
      'skills', jsonb_build_array(
        jsonb_build_object('name', 'Intimidation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Persuasion', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Représentation', 'bonus', 0, 'isProficient', false, 'hasExpertise', false),
        jsonb_build_object('name', 'Tromperie', 'bonus', 0, 'isProficient', false, 'hasExpertise', false)
      )
    )
  );
  
  -- Insérer le personnage directement avec un ID spécifique
  INSERT INTO players (
    id,
    user_id,
    name,
    adventurer_name,
    gold,
    silver,
    copper,
    max_hp,
    current_hp,
    temporary_hp,
    level,
    stats,
    abilities,
    spell_slots,
    class_resources,
    equipment,
    active_conditions,
    is_concentrating,
    concentration_spell,
    is_gm,
    hit_dice
  ) VALUES (
    new_player_id,
    p_user_id,
    p_name,
    COALESCE(p_adventurer_name, p_name),
    0,
    0,
    0,
    10,
    10,
    0,
    1,
    default_stats,
    default_abilities,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}'::jsonb,
    '{}',
    false,
    null,
    false,
    jsonb_build_object('total', 1, 'used', 0)
  );
  
  RETURN new_player_id;
  
EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erreur lors de la création du personnage: %', SQLERRM;
END;
$$;

-- Fonction pour supprimer définitivement les contraintes uniques (admin)
CREATE OR REPLACE FUNCTION admin_remove_unique_constraint()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  constraint_record RECORD;
  index_record RECORD;
BEGIN
  -- Vérifier que l'utilisateur est authentifié
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Non authentifié';
  END IF;
  
  -- Supprimer toutes les contraintes uniques sur user_id
  FOR constraint_record IN
    SELECT tc.constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'players' 
    AND tc.constraint_type = 'UNIQUE' 
    AND ccu.column_name = 'user_id'
    AND tc.table_schema = 'public'
  LOOP
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
  END LOOP;
  
  -- Supprimer tous les index uniques sur user_id
  FOR index_record IN
    SELECT indexname
    FROM pg_indexes
    WHERE tablename = 'players'
    AND indexdef LIKE '%UNIQUE%'
    AND indexdef LIKE '%user_id%'
    AND schemaname = 'public'
  LOOP
    EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
  END LOOP;
  
  -- Créer un index non-unique pour les performances
  DROP INDEX IF EXISTS players_user_id_performance_idx;
  CREATE INDEX players_user_id_performance_idx ON players(user_id);
  
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION create_player_bypass_constraint TO authenticated;
GRANT EXECUTE ON FUNCTION admin_remove_unique_constraint TO authenticated;

-- Exécuter immédiatement la suppression des contraintes
SELECT admin_remove_unique_constraint();
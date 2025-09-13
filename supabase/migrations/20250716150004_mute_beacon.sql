/*
  # Ajout de champs détaillés pour les personnages
  
  1. Nouvelles colonnes
    - `race` : Race du personnage (Humain, Elfe, etc.)
    - `subclass` : Sous-classe (Évocation, Champion, etc.)
    - `background` : Historique (Acolyte, Noble, etc.)
    - `alignment` : Alignement (Loyal Bon, Chaotique Neutre, etc.)
    - `languages` : Langues parlées (tableau de chaînes)
    - `age` : Âge du personnage
    - `gender` : Genre du personnage
    - `character_history` : Histoire du personnage (texte long)
    
  2. Sécurité
    - Maintien des politiques RLS existantes
    - Valeurs par défaut appropriées
*/

-- Ajout des nouvelles colonnes pour les détails du personnage
ALTER TABLE players
ADD COLUMN IF NOT EXISTS race text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS subclass text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS background text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS alignment text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS languages text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS age text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS gender text DEFAULT NULL,
ADD COLUMN IF NOT EXISTS character_history text DEFAULT NULL;

-- Mise à jour de la fonction de création de personnage pour inclure les nouveaux champs
CREATE OR REPLACE FUNCTION create_player_with_defaults(
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
    -- Validate input
    IF p_name IS NULL OR trim(p_name) = '' THEN
        RAISE EXCEPTION 'Character name is required';
    END IF;
    
    -- Generate new ID
    new_player_id := gen_random_uuid();
    
    -- Set default stats with null values for speed and proficiency_bonus
    default_stats := jsonb_build_object(
        'armor_class', 10,
        'initiative', 0,
        'speed', null,
        'proficiency_bonus', null,
        'inspirations', 0
    );
    
    -- Set default abilities
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
    
    -- Insert the new character with new fields
    INSERT INTO players (
        id,
        user_id,
        name,
        adventurer_name,
        race,
        subclass,
        background,
        alignment,
        languages,
        age,
        gender,
        character_history,
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
        hit_dice,
        created_at
    ) VALUES (
        new_player_id,
        p_user_id,
        trim(p_name),
        COALESCE(nullif(trim(p_adventurer_name), ''), trim(p_name)),
        NULL, -- race
        NULL, -- subclass
        NULL, -- background
        NULL, -- alignment
        '{}', -- languages
        NULL, -- age
        NULL, -- gender
        NULL, -- character_history
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
        jsonb_build_object('total', 1, 'used', 0),
        now()
    );
    
    RETURN new_player_id;
    
EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'Error creating character: %', SQLERRM;
END;
$$;

-- Vérification finale
DO $$
BEGIN
    RAISE NOTICE '=== VÉRIFICATION DES NOUVELLES COLONNES ===';
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name IN ('race', 'subclass', 'background', 'alignment', 'languages', 'age', 'gender', 'character_history')
    ) THEN
        RAISE NOTICE '✅ Nouvelles colonnes ajoutées avec succès';
    ELSE
        RAISE WARNING '⚠️ Certaines colonnes n''ont peut-être pas été ajoutées correctement';
    END IF;
    
    RAISE NOTICE '=== MIGRATION TERMINÉE ===';
    RAISE NOTICE 'Les joueurs peuvent maintenant renseigner des informations détaillées sur leurs personnages';
END $$;
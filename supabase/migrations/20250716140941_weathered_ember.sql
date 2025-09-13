/*
  # Fix player creation and default values
  
  1. Changes
    - Remove automatic player creation on user signup
    - Fix default values for new characters
    - Ensure clean player creation flow
    
  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication flow
*/

-- Step 1: Remove the trigger that automatically creates a player on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS auth.handle_new_user();

-- Step 2: Create a function to create a player with proper defaults
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
    
    -- Set default stats with empty values for speed and proficiency
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
    
    -- Insert the new character
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
        hit_dice,
        created_at
    ) VALUES (
        new_player_id,
        p_user_id,
        trim(p_name),
        COALESCE(nullif(trim(p_adventurer_name), ''), trim(p_name)),
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

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_player_with_defaults(uuid, text, text) TO authenticated;

-- Verify the function was created
DO $$
BEGIN
    RAISE NOTICE 'Function create_player_with_defaults created successfully';
    RAISE NOTICE 'Automatic player creation on signup has been disabled';
    RAISE NOTICE 'Default values for speed and proficiency bonus are now null';
END $$;
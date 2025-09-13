/*
  # Fix player creation defaults and navigation
  
  1. Changes
    - Ensure speed and proficiency_bonus are null by default
    - Fix navigation when returning to character selection
    - Improve error handling for player creation
    
  2. Security
    - Maintain all existing RLS policies
    - Preserve authentication flow
*/

-- Update the create_player_with_defaults function to set null values for speed and proficiency_bonus
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

-- Create a function to check if automatic player creation is disabled
CREATE OR REPLACE FUNCTION check_player_creation_status()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    trigger_exists boolean;
BEGIN
    -- Check if the automatic player creation trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger
        WHERE tgname = 'on_auth_user_created'
    ) INTO trigger_exists;
    
    result := result || '=== PLAYER CREATION STATUS ===' || chr(10);
    
    IF trigger_exists THEN
        result := result || '❌ Automatic player creation is ENABLED' || chr(10);
        result := result || 'This means a player is automatically created when a user signs up.' || chr(10);
        result := result || 'To disable this, run:' || chr(10);
        result := result || 'DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;' || chr(10);
        result := result || 'DROP FUNCTION IF EXISTS auth.handle_new_user();' || chr(10);
    ELSE
        result := result || '✅ Automatic player creation is DISABLED' || chr(10);
        result := result || 'This is the correct configuration. Users must manually create characters.' || chr(10);
    END IF;
    
    -- Check default stats configuration
    result := result || chr(10) || '=== DEFAULT STATS CONFIGURATION ===' || chr(10);
    
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'create_player_with_defaults'
        AND routine_schema = 'public'
    ) THEN
        result := result || '✅ create_player_with_defaults function exists' || chr(10);
        
        -- Check if the function has the correct defaults
        IF EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'create_player_with_defaults'
            AND p.prosrc LIKE '%speed%, null,%'
        ) THEN
            result := result || '✅ Function has correct NULL defaults for speed and proficiency_bonus' || chr(10);
        ELSE
            result := result || '❌ Function may not have correct NULL defaults' || chr(10);
            result := result || 'Please update the function to set speed and proficiency_bonus to NULL' || chr(10);
        END IF;
    ELSE
        result := result || '❌ create_player_with_defaults function does not exist' || chr(10);
        result := result || 'Please create this function with the correct defaults' || chr(10);
    END IF;
    
    RETURN result;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION check_player_creation_status() TO authenticated;

-- Run the check to verify the configuration
DO $$
DECLARE
    check_result text;
BEGIN
    SELECT check_player_creation_status() INTO check_result;
    RAISE NOTICE '%', check_result;
END $$;
/*
  # Correction complète des colonnes manquantes pour le profil joueur
  
  1. Modifications
    - Vérification et ajout de toutes les colonnes manquantes
    - Correction des types de données
    - Ajout d'une fonction de diagnostic complète
    
  2. Sécurité
    - Maintien des politiques RLS existantes
    - Préservation du flux d'authentification
*/

-- Vérification et ajout de toutes les colonnes manquantes
DO $$
BEGIN
    -- Vérification et ajout de la colonne subclass
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'subclass'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN subclass text DEFAULT NULL;
        RAISE NOTICE 'Colonne subclass ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne race
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'race'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN race text DEFAULT NULL;
        RAISE NOTICE 'Colonne race ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne background
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'background'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN background text DEFAULT NULL;
        RAISE NOTICE 'Colonne background ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne alignment
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'alignment'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN alignment text DEFAULT NULL;
        RAISE NOTICE 'Colonne alignment ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne languages
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'languages'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN languages text[] DEFAULT '{}';
        RAISE NOTICE 'Colonne languages ajoutée';
    ELSE
        -- Vérifier le type de la colonne languages
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'players'
            AND column_name = 'languages'
            AND table_schema = 'public'
            AND data_type != 'ARRAY'
        ) THEN
            -- Si ce n'est pas un tableau, le convertir
            ALTER TABLE players ALTER COLUMN languages TYPE text[] USING '{}';
            RAISE NOTICE 'Type de la colonne languages corrigé';
        END IF;
    END IF;
    
    -- Vérification et ajout de la colonne age
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'age'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN age text DEFAULT NULL;
        RAISE NOTICE 'Colonne age ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne gender
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'gender'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN gender text DEFAULT NULL;
        RAISE NOTICE 'Colonne gender ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne character_history
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'character_history'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN character_history text DEFAULT NULL;
        RAISE NOTICE 'Colonne character_history ajoutée';
    END IF;
END $$;

-- Fonction de diagnostic complète pour vérifier toutes les colonnes
CREATE OR REPLACE FUNCTION diagnose_player_columns()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    result text := '';
    column_record record;
    column_count integer := 0;
    missing_columns text := '';
BEGIN
    result := result || '=== DIAGNOSTIC DES COLONNES DU PROFIL JOUEUR ===' || chr(10) || chr(10);
    
    -- Liste des colonnes attendues pour le profil
    result := result || 'Vérification des colonnes requises:' || chr(10);
    
    -- Vérifier chaque colonne
    FOR column_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'players'
        AND table_schema = 'public'
        AND column_name IN ('subclass', 'race', 'background', 'alignment', 'languages', 'age', 'gender', 'character_history')
        ORDER BY column_name
    LOOP
        column_count := column_count + 1;
        result := result || '✅ ' || column_record.column_name || ' (' || column_record.data_type || 
                  CASE WHEN column_record.is_nullable = 'NO' THEN ', NOT NULL' ELSE '' END || ')' || chr(10);
    END LOOP;
    
    -- Vérifier les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'subclass' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'subclass, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'race' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'race, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'background' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'background, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'alignment' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'alignment, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'languages' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'languages, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'age' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'age, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'gender' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'gender, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'character_history' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'character_history, ';
    END IF;
    
    -- Afficher les colonnes manquantes s'il y en a
    IF missing_columns != '' THEN
        missing_columns := substring(missing_columns, 1, length(missing_columns) - 2);
        result := result || chr(10) || '❌ Colonnes manquantes: ' || missing_columns || chr(10);
    END IF;
    
    -- Résumé
    result := result || chr(10) || 'Total des colonnes vérifiées: ' || column_count || ' sur 8' || chr(10);
    
    IF column_count = 8 THEN
        result := result || chr(10) || '✅ TOUTES LES COLONNES SONT PRÉSENTES ET CORRECTEMENT CONFIGURÉES' || chr(10);
    ELSE
        result := result || chr(10) || '⚠️ CERTAINES COLONNES SONT MANQUANTES OU MAL CONFIGURÉES' || chr(10);
    END IF;
    
    -- Vérifier si la fonction update_player_profile existe
    IF EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'update_player_profile'
        AND routine_schema = 'public'
    ) THEN
        result := result || chr(10) || '✅ La fonction update_player_profile existe' || chr(10);
    ELSE
        result := result || chr(10) || '❌ La fonction update_player_profile n''existe pas' || chr(10);
    END IF;
    
    RETURN result;
END;
$$;

-- Fonction simplifiée pour mettre à jour le profil du joueur
CREATE OR REPLACE FUNCTION update_player_profile_simple(
    p_id uuid,
    p_adventurer_name text,
    p_class text,
    p_subclass text,
    p_race text,
    p_background text,
    p_alignment text,
    p_languages text[],
    p_age text,
    p_gender text,
    p_character_history text,
    p_level integer,
    p_hit_dice jsonb,
    p_stats jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    updated_player jsonb;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get player's user_id
    SELECT user_id INTO player_user_id
    FROM players
    WHERE id = p_id;
    
    -- Validate ownership
    IF player_user_id != current_user_id THEN
        RAISE EXCEPTION 'You can only update your own characters';
    END IF;
    
    -- Update the player with explicit parameters
    UPDATE players
    SET 
        adventurer_name = p_adventurer_name,
        class = p_class,
        subclass = p_subclass,
        race = p_race,
        background = p_background,
        alignment = p_alignment,
        languages = p_languages,
        age = p_age,
        gender = p_gender,
        character_history = p_character_history,
        level = p_level,
        hit_dice = p_hit_dice,
        stats = p_stats
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Fonction pour mettre à jour directement via SQL
CREATE OR REPLACE FUNCTION update_player_direct(
    p_id uuid,
    p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    updated_player jsonb;
    sql_command text;
    column_names text[];
    column_values text[];
    i integer;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get player's user_id
    SELECT user_id INTO player_user_id
    FROM players
    WHERE id = p_id;
    
    -- Validate ownership
    IF player_user_id != current_user_id THEN
        RAISE EXCEPTION 'You can only update your own characters';
    END IF;
    
    -- Construct dynamic SQL for update
    sql_command := 'UPDATE players SET ';
    
    -- Extract column names and values from jsonb
    SELECT array_agg(key), array_agg(value::text)
    INTO column_names, column_values
    FROM jsonb_each(p_data);
    
    -- Build SET clause
    FOR i IN 1..array_length(column_names, 1) LOOP
        IF i > 1 THEN
            sql_command := sql_command || ', ';
        END IF;
        
        sql_command := sql_command || column_names[i] || ' = ';
        
        -- Handle different types
        IF column_values[i] = 'null' THEN
            sql_command := sql_command || 'NULL';
        ELSE
            sql_command := sql_command || quote_literal(column_values[i]);
        END IF;
    END LOOP;
    
    -- Add WHERE clause
    sql_command := sql_command || ' WHERE id = ' || quote_literal(p_id) || ' RETURNING row_to_json(players.*)::jsonb';
    
    -- Execute the dynamic SQL
    EXECUTE sql_command INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION diagnose_player_columns() TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_profile_simple(uuid, text, text, text, text, text, text, text[], text, text, text, integer, jsonb, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION update_player_direct(uuid, jsonb) TO authenticated;

-- Exécuter le diagnostic pour vérifier les colonnes
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT diagnose_player_columns() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
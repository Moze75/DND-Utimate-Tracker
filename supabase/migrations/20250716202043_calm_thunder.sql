/*
  # Ajout des colonnes manquantes pour les points de vie
  
  1. Vérification des colonnes
    - Vérification de l'existence des colonnes max_hp, current_hp, temporary_hp
    - Ajout des colonnes si elles n'existent pas
    
  2. Diagnostic
    - Fonction pour vérifier que toutes les colonnes sont présentes
*/

-- Vérification et ajout des colonnes pour les points de vie
DO $$
BEGIN
    -- Vérification et ajout de la colonne max_hp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'max_hp'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN max_hp integer DEFAULT 10;
        RAISE NOTICE 'Colonne max_hp ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne current_hp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'current_hp'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN current_hp integer DEFAULT 10;
        RAISE NOTICE 'Colonne current_hp ajoutée';
    END IF;
    
    -- Vérification et ajout de la colonne temporary_hp
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'temporary_hp'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE players ADD COLUMN temporary_hp integer DEFAULT 0;
        RAISE NOTICE 'Colonne temporary_hp ajoutée';
    END IF;
END $$;

-- Fonction de diagnostic pour vérifier les colonnes de points de vie
CREATE OR REPLACE FUNCTION diagnose_hp_columns()
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
    result := result || '=== DIAGNOSTIC DES COLONNES DE POINTS DE VIE ===' || chr(10) || chr(10);
    
    -- Vérifier chaque colonne
    FOR column_record IN
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'players'
        AND table_schema = 'public'
        AND column_name IN ('max_hp', 'current_hp', 'temporary_hp')
        ORDER BY column_name
    LOOP
        column_count := column_count + 1;
        result := result || '✅ ' || column_record.column_name || ' (' || column_record.data_type || 
                  CASE WHEN column_record.is_nullable = 'NO' THEN ', NOT NULL' ELSE '' END || ')' || chr(10);
    END LOOP;
    
    -- Vérifier les colonnes manquantes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'max_hp' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'max_hp, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'current_hp' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'current_hp, ';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'players' AND column_name = 'temporary_hp' AND table_schema = 'public') THEN
        missing_columns := missing_columns || 'temporary_hp, ';
    END IF;
    
    -- Afficher les colonnes manquantes s'il y en a
    IF missing_columns != '' THEN
        missing_columns := substring(missing_columns, 1, length(missing_columns) - 2);
        result := result || chr(10) || '❌ Colonnes manquantes: ' || missing_columns || chr(10);
    END IF;
    
    -- Résumé
    result := result || chr(10) || 'Total des colonnes vérifiées: ' || column_count || ' sur 3' || chr(10);
    
    IF column_count = 3 THEN
        result := result || chr(10) || '✅ TOUTES LES COLONNES DE POINTS DE VIE SONT PRÉSENTES' || chr(10);
    ELSE
        result := result || chr(10) || '⚠️ CERTAINES COLONNES DE POINTS DE VIE SONT MANQUANTES' || chr(10);
    END IF;
    
    RETURN result;
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION diagnose_hp_columns() TO authenticated;

-- Exécuter le diagnostic pour vérifier les colonnes
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT diagnose_hp_columns() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
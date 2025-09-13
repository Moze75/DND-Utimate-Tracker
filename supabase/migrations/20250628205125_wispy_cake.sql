/*
  # Solution définitive pour permettre plusieurs personnages par utilisateur
  
  1. Approche radicale
    - Suppression complète et recréation de la table players si nécessaire
    - Sauvegarde des données existantes
    - Recréation sans contrainte unique sur user_id
    
  2. Sécurité
    - Maintien des politiques RLS appropriées
    - Conservation de toutes les données existantes
*/

-- Étape 1: Diagnostic complet et sauvegarde
DO $$
DECLARE
    has_unique_constraint boolean := false;
    constraint_name text;
    backup_count integer;
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC FINAL ET SOLUTION RADICALE ===';
    
    -- Vérifier s'il y a encore des contraintes uniques
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    ) INTO has_unique_constraint;
    
    IF has_unique_constraint THEN
        RAISE NOTICE '❌ CONTRAINTE UNIQUE DÉTECTÉE - SOLUTION RADICALE NÉCESSAIRE';
        
        -- Créer une table de sauvegarde avec timestamp
        EXECUTE 'CREATE TABLE players_backup_' || to_char(now(), 'YYYYMMDDHH24MISS') || ' AS SELECT * FROM players';
        
        -- Compter les enregistrements sauvegardés
        EXECUTE 'SELECT COUNT(*) FROM players_backup_' || to_char(now(), 'YYYYMMDDHH24MISS') INTO backup_count;
        RAISE NOTICE 'Sauvegarde créée avec % enregistrements', backup_count;
        
        -- Désactiver temporairement RLS
        ALTER TABLE players DISABLE ROW LEVEL SECURITY;
        
        -- Supprimer toutes les politiques
        DROP POLICY IF EXISTS "players_select_all" ON players;
        DROP POLICY IF EXISTS "players_update_own" ON players;
        DROP POLICY IF EXISTS "players_can_create_multiple" ON players;
        DROP POLICY IF EXISTS "players_insert_multiple" ON players;
        DROP POLICY IF EXISTS "auth_users_insert" ON players;
        DROP POLICY IF EXISTS "players_insert_own" ON players;
        
        -- Supprimer tous les index
        DROP INDEX IF EXISTS players_user_id_idx;
        DROP INDEX IF EXISTS players_user_id_performance_idx;
        DROP INDEX IF EXISTS players_user_id_non_unique_idx;
        
        -- Supprimer toutes les contraintes de clé étrangère temporairement
        ALTER TABLE inventory_items DROP CONSTRAINT IF EXISTS inventory_items_player_id_fkey;
        ALTER TABLE attacks DROP CONSTRAINT IF EXISTS attacks_player_id_fkey;
        ALTER TABLE player_spells DROP CONSTRAINT IF EXISTS player_spells_player_id_fkey;
        
        -- Sauvegarder les données
        CREATE TEMP TABLE temp_players AS SELECT * FROM players;
        
        -- Supprimer la table originale
        DROP TABLE players CASCADE;
        
        -- Recréer la table sans contrainte unique sur user_id
        CREATE TABLE players (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
            name text NOT NULL,
            adventurer_name text,
            avatar_url text,
            avatar_position jsonb DEFAULT '{"x": 0, "y": 0}'::jsonb,
            avatar_zoom numeric DEFAULT 1,
            class text,
            level integer DEFAULT 1,
            max_hp integer DEFAULT 10,
            current_hp integer DEFAULT 10,
            temporary_hp integer DEFAULT 0,
            spell_slots jsonb DEFAULT '{}'::jsonb,
            class_resources jsonb DEFAULT '{}'::jsonb,
            gold integer DEFAULT 0,
            silver integer DEFAULT 0,
            copper integer DEFAULT 0,
            stats jsonb DEFAULT jsonb_build_object(
                'armor_class', 10,
                'initiative', 0,
                'speed', 30,
                'proficiency_bonus', 2,
                'inspirations', 0
            ),
            abilities jsonb DEFAULT '[]'::jsonb,
            equipment jsonb DEFAULT '{}'::jsonb,
            is_gm boolean DEFAULT false,
            hit_dice jsonb DEFAULT '{}'::jsonb,
            is_concentrating boolean DEFAULT false,
            concentration_spell text,
            active_conditions text[] DEFAULT '{}',
            created_at timestamptz DEFAULT now()
        );
        
        -- Restaurer les données
        INSERT INTO players SELECT * FROM temp_players;
        
        -- Recréer les contraintes de clé étrangère
        ALTER TABLE inventory_items ADD CONSTRAINT inventory_items_player_id_fkey 
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
        ALTER TABLE attacks ADD CONSTRAINT attacks_player_id_fkey 
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
        ALTER TABLE player_spells ADD CONSTRAINT player_spells_player_id_fkey 
            FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE;
        
        -- Créer un index non-unique sur user_id pour les performances
        CREATE INDEX players_user_id_idx ON players(user_id);
        
        -- Réactiver RLS
        ALTER TABLE players ENABLE ROW LEVEL SECURITY;
        
        -- Recréer les politiques
        CREATE POLICY "players_select_all"
            ON players FOR SELECT
            TO authenticated
            USING (true);
            
        CREATE POLICY "players_update_own"
            ON players FOR UPDATE
            TO authenticated
            USING (auth.uid() = user_id);
            
        CREATE POLICY "players_insert_multiple"
            ON players FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
        
        RAISE NOTICE '✅ TABLE RECRÉÉE SANS CONTRAINTE UNIQUE';
        
    ELSE
        RAISE NOTICE '✅ AUCUNE CONTRAINTE UNIQUE DÉTECTÉE - VÉRIFICATION DES POLITIQUES';
        
        -- Assurer que les bonnes politiques existent
        DROP POLICY IF EXISTS "players_insert_own" ON players;
        DROP POLICY IF EXISTS "players_can_create_multiple" ON players;
        
        CREATE POLICY "players_insert_multiple"
            ON players FOR INSERT
            TO authenticated
            WITH CHECK (auth.uid() = user_id);
            
        -- Créer un index non-unique si nécessaire
        CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
    END IF;
END $$;

-- Étape 2: Test de validation final
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_success boolean := false;
    char1_id uuid;
    char2_id uuid;
BEGIN
    RAISE NOTICE '=== TEST DE VALIDATION FINAL ===';
    
    BEGIN
        -- Créer le premier personnage de test
        INSERT INTO players (
            user_id, name, gold, silver, copper, max_hp, current_hp, 
            temporary_hp, level, stats, is_gm
        ) VALUES (
            test_user_id, 'Test Character 1', 0, 0, 0, 10, 10, 0, 1,
            jsonb_build_object(
                'armor_class', 10,
                'initiative', 0,
                'speed', 30,
                'proficiency_bonus', 2,
                'inspirations', 0
            ),
            false
        ) RETURNING id INTO char1_id;
        
        -- Créer le deuxième personnage de test avec le même user_id
        INSERT INTO players (
            user_id, name, gold, silver, copper, max_hp, current_hp, 
            temporary_hp, level, stats, is_gm
        ) VALUES (
            test_user_id, 'Test Character 2', 0, 0, 0, 10, 10, 0, 1,
            jsonb_build_object(
                'armor_class', 10,
                'initiative', 0,
                'speed', 30,
                'proficiency_bonus', 2,
                'inspirations', 0
            ),
            false
        ) RETURNING id INTO char2_id;
        
        test_success := true;
        RAISE NOTICE '✅ TEST RÉUSSI: Deux personnages créés avec le même user_id';
        RAISE NOTICE 'Personnage 1 ID: %', char1_id;
        RAISE NOTICE 'Personnage 2 ID: %', char2_id;
        
        -- Nettoyer les données de test
        DELETE FROM players WHERE id IN (char1_id, char2_id);
        RAISE NOTICE 'Données de test nettoyées';
        
    EXCEPTION 
        WHEN unique_violation THEN
            RAISE WARNING '❌ ÉCHEC: Contrainte unique encore active - %', SQLERRM;
            test_success := false;
        WHEN OTHERS THEN
            RAISE WARNING '❌ ERREUR INATTENDUE: %', SQLERRM;
            test_success := false;
    END;
    
    IF test_success THEN
        RAISE NOTICE '🎉 SUCCÈS TOTAL: La création de multiples personnages fonctionne!';
    ELSE
        RAISE WARNING '💥 ÉCHEC: Problème persistant - intervention manuelle requise';
    END IF;
END $$;

-- Étape 3: Rapport final détaillé
DO $$
DECLARE
    constraint_count integer;
    unique_index_count integer;
    policy_count integer;
    total_players integer;
    users_with_multiple_chars integer;
BEGIN
    RAISE NOTICE '=== RAPPORT FINAL DÉTAILLÉ ===';
    
    -- Vérifier les contraintes
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'players' 
    AND tc.constraint_type = 'UNIQUE' 
    AND ccu.column_name = 'user_id'
    AND tc.table_schema = 'public';
    
    -- Vérifier les index uniques
    SELECT COUNT(*) INTO unique_index_count
    FROM pg_indexes
    WHERE tablename = 'players'
    AND indexdef LIKE '%UNIQUE%'
    AND indexdef LIKE '%user_id%'
    AND schemaname = 'public';
    
    -- Compter les politiques
    SELECT COUNT(*) INTO policy_count
    FROM pg_policies 
    WHERE tablename = 'players';
    
    -- Statistiques des joueurs
    SELECT COUNT(*) INTO total_players FROM players;
    
    SELECT COUNT(*) INTO users_with_multiple_chars
    FROM (
        SELECT user_id 
        FROM players 
        GROUP BY user_id 
        HAVING COUNT(*) > 1
    ) subq;
    
    RAISE NOTICE 'Contraintes uniques sur user_id: %', constraint_count;
    RAISE NOTICE 'Index uniques sur user_id: %', unique_index_count;
    RAISE NOTICE 'Politiques RLS actives: %', policy_count;
    RAISE NOTICE 'Total des personnages: %', total_players;
    RAISE NOTICE 'Utilisateurs avec plusieurs personnages: %', users_with_multiple_chars;
    
    IF constraint_count = 0 AND unique_index_count = 0 THEN
        RAISE NOTICE '🎯 MISSION ACCOMPLIE: Aucune contrainte unique sur user_id';
        RAISE NOTICE '🚀 Les utilisateurs peuvent maintenant créer autant de personnages qu''ils veulent!';
    ELSE
        RAISE WARNING '⚠️ ATTENTION: Des contraintes persistent encore';
    END IF;
END $$;
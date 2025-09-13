/*
  # Permettre la création de plusieurs personnages par utilisateur
  
  1. Changements
    - Suppression définitive de toutes les contraintes uniques sur user_id
    - Vérification et nettoyage complet des contraintes
    - Mise à jour des politiques RLS pour permettre plusieurs personnages
    - Ajout d'un index non-unique pour les performances
  
  2. Sécurité
    - Maintien de la sécurité RLS
    - Les utilisateurs ne peuvent toujours que gérer leurs propres personnages
*/

-- Étape 1: Diagnostic complet des contraintes existantes
DO $$
DECLARE
    constraint_record RECORD;
    index_record RECORD;
    policy_record RECORD;
BEGIN
    RAISE NOTICE '=== DIAGNOSTIC DES CONTRAINTES ===';
    
    -- Lister toutes les contraintes sur la table players
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.constraint_type, ccu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.table_schema = 'public'
        ORDER BY tc.constraint_type, tc.constraint_name
    LOOP
        RAISE NOTICE 'Contrainte trouvée: % (type: %, colonne: %)', 
            constraint_record.constraint_name, 
            constraint_record.constraint_type, 
            constraint_record.column_name;
    END LOOP;
    
    -- Lister tous les index sur la table players
    FOR index_record IN
        SELECT indexname, indexdef
        FROM pg_indexes
        WHERE tablename = 'players'
        AND schemaname = 'public'
        ORDER BY indexname
    LOOP
        RAISE NOTICE 'Index trouvé: % - %', index_record.indexname, index_record.indexdef;
    END LOOP;
END $$;

-- Étape 2: Suppression forcée de toutes les contraintes uniques sur user_id
DO $$
DECLARE
    constraint_record RECORD;
    index_record RECORD;
    sql_command text;
BEGIN
    RAISE NOTICE '=== SUPPRESSION DES CONTRAINTES UNIQUES ===';
    
    -- Supprimer toutes les contraintes uniques impliquant user_id
    FOR constraint_record IN
        SELECT tc.constraint_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        sql_command := 'ALTER TABLE players DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        EXECUTE sql_command;
        RAISE NOTICE 'Contrainte supprimée: %', constraint_record.constraint_name;
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
        sql_command := 'DROP INDEX IF EXISTS ' || index_record.indexname;
        EXECUTE sql_command;
        RAISE NOTICE 'Index unique supprimé: %', index_record.indexname;
    END LOOP;
    
    -- Supprimer spécifiquement les contraintes connues
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_key';
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS players_user_id_unique';
    EXECUTE 'ALTER TABLE players DROP CONSTRAINT IF EXISTS unique_user_id';
    
    RAISE NOTICE 'Suppression des contraintes terminée';
END $$;

-- Étape 3: Vérification que la suppression a fonctionné
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    ) THEN
        RAISE NOTICE '✅ SUCCÈS: Aucune contrainte unique sur user_id';
    ELSE
        RAISE WARNING '❌ ÉCHEC: Des contraintes uniques existent encore sur user_id';
    END IF;
END $$;

-- Étape 4: Mise à jour des politiques RLS
DROP POLICY IF EXISTS "players_insert_own" ON players;
DROP POLICY IF EXISTS "players_insert_multiple" ON players;
DROP POLICY IF EXISTS "auth_users_insert" ON players;

-- Nouvelle politique pour permettre l'insertion de plusieurs personnages
CREATE POLICY "players_can_create_multiple"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Vérifier que les autres politiques existent
DO $$
BEGIN
    -- Politique de lecture
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname LIKE '%select%'
    ) THEN
        EXECUTE 'CREATE POLICY "players_select_all" ON players FOR SELECT TO authenticated USING (true)';
        RAISE NOTICE 'Politique de lecture créée';
    END IF;
    
    -- Politique de mise à jour
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'players' 
        AND policyname LIKE '%update%'
    ) THEN
        EXECUTE 'CREATE POLICY "players_update_own" ON players FOR UPDATE TO authenticated USING (auth.uid() = user_id)';
        RAISE NOTICE 'Politique de mise à jour créée';
    END IF;
END $$;

-- Étape 5: Créer un index non-unique pour les performances
DROP INDEX IF EXISTS players_user_id_idx;
DROP INDEX IF EXISTS players_user_id_non_unique_idx;
CREATE INDEX players_user_id_performance_idx ON players(user_id);

-- Étape 6: Test de validation
DO $$
DECLARE
    test_user_id uuid := gen_random_uuid();
    test_result boolean := false;
BEGIN
    RAISE NOTICE '=== TEST DE VALIDATION ===';
    
    -- Simuler l'insertion de deux personnages avec le même user_id
    BEGIN
        -- Premier personnage (simulation)
        INSERT INTO players (user_id, name, gold, silver, copper, max_hp, current_hp, temporary_hp, level, stats)
        VALUES (test_user_id, 'Test Character 1', 0, 0, 0, 10, 10, 0, 1, '{"armor_class": 10, "initiative": 0, "speed": 30, "proficiency_bonus": 2, "inspirations": 0}');
        
        -- Deuxième personnage (simulation)
        INSERT INTO players (user_id, name, gold, silver, copper, max_hp, current_hp, temporary_hp, level, stats)
        VALUES (test_user_id, 'Test Character 2', 0, 0, 0, 10, 10, 0, 1, '{"armor_class": 10, "initiative": 0, "speed": 30, "proficiency_bonus": 2, "inspirations": 0}');
        
        test_result := true;
        
        -- Nettoyer les données de test
        DELETE FROM players WHERE user_id = test_user_id;
        
    EXCEPTION WHEN unique_violation THEN
        RAISE WARNING '❌ ÉCHEC DU TEST: Contrainte unique encore active';
        test_result := false;
    WHEN OTHERS THEN
        RAISE WARNING '❌ ERREUR INATTENDUE LORS DU TEST: %', SQLERRM;
        test_result := false;
    END;
    
    IF test_result THEN
        RAISE NOTICE '✅ TEST RÉUSSI: Plusieurs personnages peuvent être créés pour le même utilisateur';
    ELSE
        RAISE WARNING '❌ TEST ÉCHOUÉ: Impossible de créer plusieurs personnages';
    END IF;
END $$;

-- Étape 7: Rapport final
DO $$
DECLARE
    constraint_count integer;
    unique_index_count integer;
    policy_count integer;
BEGIN
    RAISE NOTICE '=== RAPPORT FINAL ===';
    
    -- Compter les contraintes uniques restantes sur user_id
    SELECT COUNT(*) INTO constraint_count
    FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
    WHERE tc.table_name = 'players' 
    AND tc.constraint_type = 'UNIQUE' 
    AND ccu.column_name = 'user_id'
    AND tc.table_schema = 'public';
    
    -- Compter les index uniques sur user_id
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
    
    RAISE NOTICE 'Contraintes uniques sur user_id: %', constraint_count;
    RAISE NOTICE 'Index uniques sur user_id: %', unique_index_count;
    RAISE NOTICE 'Politiques RLS: %', policy_count;
    
    IF constraint_count = 0 AND unique_index_count = 0 AND policy_count >= 3 THEN
        RAISE NOTICE '🎉 MIGRATION RÉUSSIE: Les utilisateurs peuvent maintenant créer plusieurs personnages!';
    ELSE
        RAISE WARNING '⚠️  MIGRATION INCOMPLÈTE: Vérification manuelle requise';
    END IF;
END $$;
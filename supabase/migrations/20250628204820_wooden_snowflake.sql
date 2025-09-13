/*
  # Fix final pour la table players
  
  1. Modifications
    - Suppression définitive de toutes les contraintes uniques sur user_id
    - Vérification et nettoyage complet de la structure
    - Ajout de logs pour le débogage
*/

-- Étape 1: Supprimer toutes les contraintes uniques sur user_id
DO $$
DECLARE
    constraint_record RECORD;
    index_record RECORD;
BEGIN
    -- Supprimer toutes les contraintes uniques sur user_id
    FOR constraint_record IN
        SELECT tc.constraint_name, tc.table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    LOOP
        EXECUTE 'ALTER TABLE ' || constraint_record.table_name || ' DROP CONSTRAINT IF EXISTS ' || constraint_record.constraint_name;
        RAISE NOTICE 'Supprimé la contrainte: %', constraint_record.constraint_name;
    END LOOP;
    
    -- Supprimer tous les index uniques sur user_id
    FOR index_record IN
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE tablename = 'players'
        AND indexdef LIKE '%UNIQUE%'
        AND indexdef LIKE '%user_id%'
        AND schemaname = 'public'
    LOOP
        EXECUTE 'DROP INDEX IF EXISTS ' || index_record.indexname;
        RAISE NOTICE 'Supprimé l''index unique: %', index_record.indexname;
    END LOOP;
    
    -- Vérification finale
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.table_constraints tc
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = 'players' 
        AND tc.constraint_type = 'UNIQUE' 
        AND ccu.column_name = 'user_id'
        AND tc.table_schema = 'public'
    ) THEN
        RAISE NOTICE 'SUCCÈS: Aucune contrainte unique trouvée sur la colonne user_id';
    ELSE
        RAISE WARNING 'ATTENTION: Des contraintes uniques existent encore sur user_id';
    END IF;
END $$;

-- Étape 2: Vérifier la structure de la table
DO $$
BEGIN
    -- Vérifier que la colonne user_id existe et n'est pas NOT NULL
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'players' 
        AND column_name = 'user_id' 
        AND is_nullable = 'NO'
    ) THEN
        RAISE NOTICE 'La colonne user_id est NOT NULL - ceci est normal';
    ELSE
        RAISE NOTICE 'La colonne user_id est nullable';
    END IF;
    
    -- Vérifier les politiques RLS
    IF EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'players'
    ) THEN
        RAISE NOTICE 'Des politiques RLS sont configurées pour la table players';
    ELSE
        RAISE WARNING 'Aucune politique RLS trouvée pour la table players';
    END IF;
END $$;

-- Étape 3: Assurer que les politiques permettent la création de multiples personnages
DROP POLICY IF EXISTS "players_insert_own" ON players;

CREATE POLICY "players_insert_multiple"
ON players FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Étape 4: Créer un index non-unique sur user_id pour les performances
DROP INDEX IF EXISTS players_user_id_idx;
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);

RAISE NOTICE 'Migration terminée - Les utilisateurs peuvent maintenant créer plusieurs personnages';
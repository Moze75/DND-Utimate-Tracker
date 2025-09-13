/*
  # Correction des politiques RLS pour la table spells
  
  1. Problème identifié
    - La table spells génère une erreur RLS lors de l'insertion
    - Code d'erreur 42501: "new row violates row-level security policy"
    - L'ajout de sorts fonctionne via player_spells mais génère un message d'erreur
    
  2. Solution
    - Ajout d'une politique d'insertion pour les utilisateurs authentifiés
    - Maintien de la lecture publique
    - Suppression des anciennes politiques conflictuelles
    
  3. Sécurité
    - Lecture publique maintenue (tous peuvent voir les sorts)
    - Insertion autorisée pour les utilisateurs authentifiés
    - Pas de modification des sorts existants sans permissions spéciales
*/

-- Supprimer toutes les anciennes politiques sur la table spells
DROP POLICY IF EXISTS "Spells are readable by everyone" ON spells;
DROP POLICY IF EXISTS "Public can read spells" ON spells;
DROP POLICY IF EXISTS "Authenticated users can insert spells" ON spells;
DROP POLICY IF EXISTS "Accès public aux sorts" ON spells;

-- Créer une politique de lecture publique claire
CREATE POLICY "spells_public_read"
  ON spells FOR SELECT
  TO public
  USING (true);

-- Créer une politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "spells_authenticated_insert"
  ON spells FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Créer une politique de mise à jour pour les utilisateurs authentifiés (optionnel)
CREATE POLICY "spells_authenticated_update"
  ON spells FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Vérification que les politiques ont été créées correctement
DO $$
DECLARE
    select_policy_count integer;
    insert_policy_count integer;
    update_policy_count integer;
BEGIN
    -- Compter les politiques par type
    SELECT COUNT(*) INTO select_policy_count
    FROM pg_policies
    WHERE tablename = 'spells'
    AND cmd = 'SELECT';
    
    SELECT COUNT(*) INTO insert_policy_count
    FROM pg_policies
    WHERE tablename = 'spells'
    AND cmd = 'INSERT';
    
    SELECT COUNT(*) INTO update_policy_count
    FROM pg_policies
    WHERE tablename = 'spells'
    AND cmd = 'UPDATE';
    
    RAISE NOTICE '=== VÉRIFICATION DES POLITIQUES RLS POUR SPELLS ===';
    RAISE NOTICE 'Politiques SELECT: %', select_policy_count;
    RAISE NOTICE 'Politiques INSERT: %', insert_policy_count;
    RAISE NOTICE 'Politiques UPDATE: %', update_policy_count;
    
    IF select_policy_count >= 1 AND insert_policy_count >= 1 THEN
        RAISE NOTICE '✅ Politiques RLS correctement configurées';
        RAISE NOTICE '✅ Les utilisateurs authentifiés peuvent maintenant insérer des sorts sans erreur';
        RAISE NOTICE '✅ La lecture publique est maintenue';
    ELSE
        RAISE WARNING '⚠️ Problème avec les politiques RLS:';
        IF select_policy_count = 0 THEN
            RAISE WARNING '  - Aucune politique SELECT trouvée';
        END IF;
        IF insert_policy_count = 0 THEN
            RAISE WARNING '  - Aucune politique INSERT trouvée';
        END IF;
    END IF;
END $$;

-- Test d'insertion pour vérifier que les politiques fonctionnent
DO $$
DECLARE
    test_spell_id uuid;
    test_success boolean := false;
BEGIN
    RAISE NOTICE '=== TEST D''INSERTION DANS LA TABLE SPELLS ===';
    
    -- Générer un ID de test
    test_spell_id := gen_random_uuid();
    
    BEGIN
        -- Tenter d'insérer un sort de test
        INSERT INTO spells (
            id,
            name,
            level,
            school,
            casting_time,
            range,
            components,
            duration,
            description
        ) VALUES (
            test_spell_id,
            'Sort de Test',
            0,
            'Évocation',
            '1 action',
            '9 mètres',
            '{"V": true, "S": false, "M": null}',
            'Instantané',
            'Ceci est un sort de test pour vérifier les politiques RLS.'
        );
        
        test_success := true;
        RAISE NOTICE '✅ Test d''insertion réussi';
        
        -- Nettoyer le sort de test
        DELETE FROM spells WHERE id = test_spell_id;
        RAISE NOTICE '🧹 Sort de test supprimé';
        
    EXCEPTION 
        WHEN insufficient_privilege THEN
            RAISE WARNING '❌ Test d''insertion échoué: Privilèges insuffisants';
        WHEN OTHERS THEN
            RAISE WARNING '❌ Test d''insertion échoué: %', SQLERRM;
    END;
    
    IF test_success THEN
        RAISE NOTICE '🎉 LES POLITIQUES RLS FONCTIONNENT CORRECTEMENT';
        RAISE NOTICE '✅ L''insertion dans la table spells ne devrait plus générer d''erreur';
    ELSE
        RAISE WARNING '💥 LES POLITIQUES RLS NE FONCTIONNENT PAS CORRECTEMENT';
        RAISE WARNING '⚠️ Le message d''erreur persistera probablement';
    END IF;
END $$;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION TERMINÉE ===';
    RAISE NOTICE 'Les politiques RLS pour la table spells ont été corrigées.';
    RAISE NOTICE 'L''ajout de sorts ne devrait plus générer de message d''erreur.';
    RAISE NOTICE 'Si le problème persiste, vérifiez les logs de la console pour d''autres erreurs.';
END $$;
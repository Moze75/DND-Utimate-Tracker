/*
  # Correction des politiques RLS pour la table spells
  
  1. Problème identifié
    - La table spells n'a qu'une politique de lecture (SELECT)
    - Aucune politique d'insertion (INSERT) pour les utilisateurs authentifiés
    - Code d'erreur 42501: "new row violates row-level security policy"
    
  2. Solution
    - Ajout d'une politique permettant aux utilisateurs authentifiés d'insérer des sorts
    - Maintien de la sécurité en lecture publique
    - Permet l'ajout dynamique de sorts depuis le grimoire
    
  3. Sécurité
    - Lecture publique maintenue (tous peuvent voir les sorts)
    - Insertion limitée aux utilisateurs authentifiés
    - Pas de modification des sorts existants
*/

-- Supprimer l'ancienne politique de lecture s'elle existe
DROP POLICY IF EXISTS "Spells are readable by everyone" ON spells;

-- Créer une nouvelle politique de lecture publique
CREATE POLICY "Public can read spells"
  ON spells FOR SELECT
  TO public
  USING (true);

-- Ajouter une politique d'insertion pour les utilisateurs authentifiés
CREATE POLICY "Authenticated users can insert spells"
  ON spells FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Vérification que les politiques ont été créées
DO $$
DECLARE
    select_policy_count integer;
    insert_policy_count integer;
BEGIN
    -- Compter les politiques SELECT
    SELECT COUNT(*) INTO select_policy_count
    FROM pg_policies
    WHERE tablename = 'spells'
    AND cmd = 'SELECT';
    
    -- Compter les politiques INSERT
    SELECT COUNT(*) INTO insert_policy_count
    FROM pg_policies
    WHERE tablename = 'spells'
    AND cmd = 'INSERT';
    
    RAISE NOTICE '=== VÉRIFICATION DES POLITIQUES RLS ===';
    RAISE NOTICE 'Politiques SELECT sur spells: %', select_policy_count;
    RAISE NOTICE 'Politiques INSERT sur spells: %', insert_policy_count;
    
    IF select_policy_count >= 1 AND insert_policy_count >= 1 THEN
        RAISE NOTICE '✅ Politiques RLS correctement configurées pour la table spells';
        RAISE NOTICE '✅ Les utilisateurs authentifiés peuvent maintenant ajouter des sorts';
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
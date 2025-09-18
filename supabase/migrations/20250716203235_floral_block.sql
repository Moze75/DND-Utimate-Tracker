/*
  # Ajout du support des sous-classes
  
  1. Modifications
    - Vérification de l'existence de la colonne subclass
    - Ajout de la colonne si elle n'existe pas
    - Création d'une fonction pour obtenir les sous-classes par classe
    
  2. Sécurité
    - Maintien des politiques RLS existantes
    - Préservation du flux d'authentification
*/

-- Vérification et ajout de la colonne subclass
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
END $$;

-- Fonction pour obtenir les sous-classes par classe
CREATE OR REPLACE FUNCTION get_subclasses_by_class(p_class text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    subclasses jsonb;
BEGIN
    CASE p_class
        WHEN 'Barbare' THEN
            subclasses := jsonb_build_array(
                'Voie du Berserker',
                'Cœur sauvage',
                'Voie de l'Arbre-Monde',
                'Zélote'
            );
        WHEN 'Barde' THEN
            subclasses := jsonb_build_array(
                'Collège de la danse',
                'Collège du glamour',
                'Collège du savoir',
                'Collège de la vaillance'
            );
        WHEN 'Clerc' THEN
            subclasses := jsonb_build_array(
                'Domaine de la vie',
                'Domaine de la lumière',
                'Domaine de la tromperie',
                'Domaine de la guerre'
            );
        WHEN 'Druide' THEN
            subclasses := jsonb_build_array(
                'Cercle de la terre',
                'Cercle de la lune',
                'Cercle de la mer',
                'Cercle des étoiles'
            );
        WHEN 'Guerrier' THEN
            subclasses := jsonb_build_array(
                'Maître de bataille',
                'Champion',
                'Chevalier eldritch',
                'Guerrier psi'
            );
        WHEN 'Moine' THEN
            subclasses := jsonb_build_array(
                'Guerrier de la miséricorde',
                'Maître des ombres',
                'Disciple des éléments',
                'Voie de la main ouverte'
            );
        WHEN 'Paladin' THEN
            subclasses := jsonb_build_array(
                'Serment de dévotion',
                'Serment de gloire',
                'Serment des anciens',
                'Serment de vengeance'
            );
        WHEN 'Rôdeur' THEN
            subclasses := jsonb_build_array(
                'Maître des bêtes',
                'Vagabond féerique',
                'Traqueur des ténèbres',
                'Chasseur'
            );
        WHEN 'Roublard' THEN
            subclasses := jsonb_build_array(
                'Escroc arcanique',
                'Assassin',
                'Couteau spectral',
                'Voleur'
            );
        WHEN 'Ensorceleur' THEN
            subclasses := jsonb_build_array(
                'Magie aberrante',
                'Magie horlogère',
                'Magie draconique',
                'Magie sauvage'
            );
        WHEN 'Sorcier' THEN
            subclasses := jsonb_build_array(
                'Patron farfadet (Archfey)',
                'Patron céleste',
                'Patron démoniaque',
                'Grand Ancien'
            );
        WHEN 'Magicien' THEN
            subclasses := jsonb_build_array(
                'École d''abjuration',
                'École de divination',
                'École d''évocation',
                'École d''illusion'
            );
        ELSE
            subclasses := jsonb_build_array();
    END CASE;
    
    RETURN subclasses;
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION get_subclasses_by_class(text) TO authenticated;

-- Vérification finale
DO $$
DECLARE
    column_exists boolean;
    function_exists boolean;
BEGIN
    -- Vérifier si la colonne subclass existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'players'
        AND column_name = 'subclass'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    -- Vérifier si la fonction get_subclasses_by_class existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'get_subclasses_by_class'
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    RAISE NOTICE '=== VÉRIFICATION DU SUPPORT DES SOUS-CLASSES ===';
    
    IF column_exists THEN
        RAISE NOTICE '✅ La colonne subclass existe';
    ELSE
        RAISE WARNING '❌ La colonne subclass n''existe pas';
    END IF;
    
    IF function_exists THEN
        RAISE NOTICE '✅ La fonction get_subclasses_by_class existe';
    ELSE
        RAISE WARNING '❌ La fonction get_subclasses_by_class n''existe pas';
    END IF;
    
    IF column_exists AND function_exists THEN
        RAISE NOTICE '🎉 Le support des sous-classes est correctement configuré';
    ELSE
        RAISE WARNING '⚠️ Le support des sous-classes n''est pas correctement configuré';
    END IF;
END $$;
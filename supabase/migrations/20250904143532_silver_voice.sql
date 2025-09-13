/*
  # Suppression du système de favoris pour les sorts
  
  1. Modifications
    - Suppression de la colonne is_favorite de la table player_spells
    - Nettoyage des données existantes
    - Optimisation de la structure de la table
    
  2. Sécurité
    - Maintien des politiques RLS existantes
    - Pas d'impact sur les autres fonctionnalités
*/

-- Supprimer la colonne is_favorite de la table player_spells
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'player_spells'
        AND column_name = 'is_favorite'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE player_spells DROP COLUMN is_favorite;
        RAISE NOTICE '✅ Colonne is_favorite supprimée de player_spells';
    ELSE
        RAISE NOTICE 'ℹ️ Colonne is_favorite n''existe pas dans player_spells';
    END IF;
END $$;

-- Vérification que la suppression a fonctionné
DO $$
DECLARE
    column_exists boolean;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'player_spells'
        AND column_name = 'is_favorite'
        AND table_schema = 'public'
    ) INTO column_exists;
    
    RAISE NOTICE '=== VÉRIFICATION DE LA SUPPRESSION ===';
    
    IF NOT column_exists THEN
        RAISE NOTICE '✅ Système de favoris complètement supprimé';
        RAISE NOTICE '✅ La table player_spells ne contient plus la colonne is_favorite';
        RAISE NOTICE '✅ L''interface sera plus simple et épurée';
    ELSE
        RAISE WARNING '❌ La colonne is_favorite existe encore';
    END IF;
END $$;

-- Message final
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION TERMINÉE ===';
    RAISE NOTICE 'Le système de favoris a été supprimé de la base de données.';
    RAISE NOTICE 'L''interface des sorts sera maintenant plus simple et focalisée sur l''essentiel.';
END $$;
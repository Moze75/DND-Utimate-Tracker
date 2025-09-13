/*
  # Fix pour la mise à jour des PV
  
  1. Modifications
    - Création d'une fonction simplifiée pour mettre à jour les PV
    - Optimisation des performances
    - Correction des problèmes de mise à jour
    
  2. Sécurité
    - Vérification de l'authentification
    - Vérification de la propriété du personnage
*/

-- Fonction optimisée pour mettre à jour les PV
CREATE OR REPLACE FUNCTION update_player_hp_v2(
    p_id uuid,
    p_current_hp integer,
    p_temporary_hp integer DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    player_max_hp integer;
    updated_player jsonb;
BEGIN
    -- Récupère l'ID de l'utilisateur actuel
    current_user_id := auth.uid();
    
    -- Vérifie que l'utilisateur est authentifié
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non authentifié';
    END IF;
    
    -- Récupère l'ID de l'utilisateur propriétaire du personnage et les PV max
    SELECT user_id, max_hp INTO player_user_id, player_max_hp
    FROM players
    WHERE id = p_id;
    
    -- Vérifie que le personnage existe
    IF player_user_id IS NULL THEN
        RAISE EXCEPTION 'Personnage non trouvé';
    END IF;
    
    -- Vérifie que l'utilisateur est le propriétaire du personnage
    IF player_user_id != current_user_id THEN
        RAISE EXCEPTION 'Vous ne pouvez mettre à jour que vos propres personnages';
    END IF;
    
    -- Limite les PV actuels entre 0 et max_hp
    p_current_hp := GREATEST(0, LEAST(player_max_hp, p_current_hp));
    
    -- Met à jour les PV
    IF p_temporary_hp IS NOT NULL THEN
        UPDATE players
        SET 
            current_hp = p_current_hp,
            temporary_hp = GREATEST(0, p_temporary_hp)
        WHERE id = p_id
        RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    ELSE
        UPDATE players
        SET current_hp = p_current_hp
        WHERE id = p_id
        RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    END IF;
    
    RETURN updated_player;
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION update_player_hp_v2(uuid, integer, integer) TO authenticated;

-- Vérification finale
DO $$
DECLARE
    function_exists boolean;
BEGIN
    -- Vérifie si la fonction existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.routines
        WHERE routine_name = 'update_player_hp_v2'
        AND routine_schema = 'public'
    ) INTO function_exists;
    
    RAISE NOTICE '=== VÉRIFICATION DE LA FONCTION ===';
    
    IF function_exists THEN
        RAISE NOTICE '✅ La fonction update_player_hp_v2 a été créée avec succès';
        RAISE NOTICE '✅ Cette fonction devrait résoudre les problèmes de mise à jour des PV';
    ELSE
        RAISE WARNING '⚠️ La fonction update_player_hp_v2 n''a pas été créée correctement';
    END IF;
END $$;
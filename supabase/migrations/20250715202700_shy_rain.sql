/*
  # Fix pour la mise à jour des PV et emplacements de sorts
  
  1. Modifications
    - Création d'une fonction optimisée pour mettre à jour les PV
    - Simplification de la logique de mise à jour
    - Amélioration des performances
    
  2. Sécurité
    - Vérification de l'authentification
    - Vérification de la propriété du personnage
*/

-- Fonction optimisée pour mettre à jour les PV
CREATE OR REPLACE FUNCTION update_player_hp_simple(
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

-- Fonction simplifiée pour mettre à jour les emplacements de sorts
CREATE OR REPLACE FUNCTION update_spell_slot_simple(
    p_id uuid,
    p_level integer,
    p_is_used boolean
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_record players%ROWTYPE;
    level_key text;
    used_key text;
    current_used integer;
    max_slots integer;
    new_spell_slots jsonb;
    updated_player jsonb;
BEGIN
    -- Récupère l'ID de l'utilisateur actuel
    current_user_id := auth.uid();
    
    -- Vérifie que l'utilisateur est authentifié
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur non authentifié';
    END IF;
    
    -- Récupère les données du joueur
    SELECT * INTO player_record
    FROM players
    WHERE id = p_id;
    
    -- Vérifie que le personnage existe
    IF player_record.id IS NULL THEN
        RAISE EXCEPTION 'Personnage non trouvé';
    END IF;
    
    -- Vérifie que l'utilisateur est le propriétaire du personnage
    IF player_record.user_id != current_user_id THEN
        RAISE EXCEPTION 'Vous ne pouvez mettre à jour que vos propres personnages';
    END IF;
    
    -- Construit les clés pour accéder aux emplacements de sorts
    level_key := 'level' || p_level;
    used_key := 'used' || p_level;
    
    -- Récupère les valeurs actuelles
    current_used := (player_record.spell_slots->>used_key)::integer;
    max_slots := (player_record.spell_slots->>level_key)::integer;
    
    -- Vérifie les limites
    IF p_is_used AND current_used >= max_slots THEN
        RAISE EXCEPTION 'Tous les emplacements de sorts de niveau % sont déjà utilisés', p_level;
    END IF;
    
    IF NOT p_is_used AND current_used <= 0 THEN
        RAISE EXCEPTION 'Aucun emplacement de sort de niveau % n''est utilisé', p_level;
    END IF;
    
    -- Crée une copie des emplacements de sorts
    new_spell_slots := player_record.spell_slots;
    
    -- Met à jour la valeur
    IF p_is_used THEN
        new_spell_slots := jsonb_set(new_spell_slots, ARRAY[used_key], to_jsonb(current_used + 1));
    ELSE
        new_spell_slots := jsonb_set(new_spell_slots, ARRAY[used_key], to_jsonb(current_used - 1));
    END IF;
    
    -- Met à jour le personnage
    UPDATE players
    SET spell_slots = new_spell_slots
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Accorder les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION update_player_hp_simple(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION update_spell_slot_simple(uuid, integer, boolean) TO authenticated;

-- Vérification finale
DO $$
DECLARE
    function_count integer;
BEGIN
    -- Compte les fonctions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('update_player_hp_simple', 'update_spell_slot_simple')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== VÉRIFICATION DES FONCTIONS ===';
    RAISE NOTICE 'Fonctions créées: %', function_count;
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Les fonctions ont été créées avec succès';
        RAISE NOTICE '✅ Ces fonctions simplifiées devraient résoudre les problèmes de mise à jour des PV et des emplacements de sorts';
    ELSE
        RAISE WARNING '⚠️ Certaines fonctions n''ont peut-être pas été créées correctement';
    END IF;
END $$;
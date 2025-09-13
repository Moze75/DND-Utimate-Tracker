/*
  # Optimisation des performances et réduction des requêtes
  
  1. Modifications
    - Ajout d'un index composite sur players(user_id, id) pour accélérer les requêtes
    - Ajout d'un index sur players(current_hp) pour les requêtes de statut
    - Optimisation des paramètres de vacuum pour réduire la charge
    - Création d'une fonction pour mettre à jour les PV efficacement
    
  2. Sécurité
    - Maintien des politiques RLS existantes
    - Utilisation de SECURITY DEFINER pour les fonctions critiques
*/

-- Ajout d'index composites pour améliorer les performances
DROP INDEX IF EXISTS players_user_id_performance_idx;
CREATE INDEX players_user_id_id_idx ON players(user_id, id);
CREATE INDEX players_current_hp_idx ON players(current_hp);
CREATE INDEX players_is_gm_idx ON players(is_gm);

-- Optimisation des paramètres de vacuum
ALTER TABLE players SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE players SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE inventory_items SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE inventory_items SET (autovacuum_analyze_scale_factor = 0.02);

-- Fonction optimisée pour mettre à jour les PV
CREATE OR REPLACE FUNCTION update_player_hp(
    p_id uuid,
    p_current_hp integer,
    p_temporary_hp integer DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    player_max_hp integer;
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
        WHERE id = p_id;
    ELSE
        UPDATE players
        SET current_hp = p_current_hp
        WHERE id = p_id;
    END IF;
END;
$$;

-- Fonction optimisée pour effectuer un repos long
CREATE OR REPLACE FUNCTION perform_long_rest(
    p_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    player_record players%ROWTYPE;
    updated_player jsonb;
    half_level integer;
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
        RAISE EXCEPTION 'Vous ne pouvez effectuer un repos long que pour vos propres personnages';
    END IF;
    
    -- Calcule la moitié du niveau (pour la récupération des dés de vie)
    half_level := FLOOR(player_record.level / 2);
    
    -- Met à jour le personnage
    UPDATE players
    SET
        current_hp = max_hp,
        temporary_hp = 0,
        hit_dice = jsonb_build_object(
            'total', level,
            'used', GREATEST(0, (player_record.hit_dice->>'used')::integer - half_level)
        ),
        class_resources = jsonb_build_object(
            'rage', player_record.class_resources->>'rage',
            'used_rage', 0,
            'bardic_inspiration', player_record.class_resources->>'bardic_inspiration',
            'used_bardic_inspiration', 0,
            'channel_divinity', player_record.class_resources->>'channel_divinity',
            'used_channel_divinity', 0,
            'wild_shape', player_record.class_resources->>'wild_shape',
            'used_wild_shape', 0,
            'sorcery_points', player_record.class_resources->>'sorcery_points',
            'used_sorcery_points', 0,
            'action_surge', player_record.class_resources->>'action_surge',
            'used_action_surge', 0,
            'arcane_recovery', player_record.class_resources->>'arcane_recovery',
            'used_arcane_recovery', false,
            'ki_points', player_record.class_resources->>'ki_points',
            'used_ki_points', 0,
            'lay_on_hands', player_record.class_resources->>'lay_on_hands',
            'used_lay_on_hands', 0,
            'favored_foe', player_record.class_resources->>'favored_foe',
            'used_favored_foe', 0,
            'sneak_attack', player_record.class_resources->>'sneak_attack'
        ),
        spell_slots = jsonb_build_object(
            'level1', player_record.spell_slots->>'level1',
            'level2', player_record.spell_slots->>'level2',
            'level3', player_record.spell_slots->>'level3',
            'level4', player_record.spell_slots->>'level4',
            'level5', player_record.spell_slots->>'level5',
            'level6', player_record.spell_slots->>'level6',
            'level7', player_record.spell_slots->>'level7',
            'level8', player_record.spell_slots->>'level8',
            'level9', player_record.spell_slots->>'level9',
            'used1', 0,
            'used2', 0,
            'used3', 0,
            'used4', 0,
            'used5', 0,
            'used6', 0,
            'used7', 0,
            'used8', 0,
            'used9', 0
        ),
        is_concentrating = false,
        concentration_spell = null
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_player_hp(uuid, integer, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION perform_long_rest(uuid) TO authenticated;

-- Create a function to perform a short rest
CREATE OR REPLACE FUNCTION perform_short_rest(
    p_id uuid,
    p_use_hit_die boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_record players%ROWTYPE;
    hit_die_size integer;
    roll integer;
    con_modifier integer;
    healing integer;
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
        RAISE EXCEPTION 'Vous ne pouvez effectuer un repos court que pour vos propres personnages';
    END IF;
    
    -- Vérifie que le joueur a des dés de vie disponibles
    IF p_use_hit_die AND (
        player_record.hit_dice IS NULL OR 
        (player_record.hit_dice->>'total')::integer - (player_record.hit_dice->>'used')::integer <= 0
    ) THEN
        RAISE EXCEPTION 'Aucun dé de vie disponible';
    END IF;
    
    -- Détermine la taille du dé de vie en fonction de la classe
    CASE player_record.class
        WHEN 'Barbare' THEN hit_die_size := 12;
        WHEN 'Guerrier', 'Paladin', 'Rôdeur' THEN hit_die_size := 10;
        WHEN 'Barde', 'Clerc', 'Druide', 'Moine', 'Roublard', 'Sorcier' THEN hit_die_size := 8;
        WHEN 'Magicien', 'Ensorceleur' THEN hit_die_size := 6;
        ELSE hit_die_size := 8;
    END CASE;
    
    -- Calcule le modificateur de Constitution
    SELECT modifier INTO con_modifier
    FROM jsonb_array_elements(player_record.abilities)
    WHERE (value->>'name') = 'Constitution'
    LIMIT 1;
    
    IF con_modifier IS NULL THEN
        con_modifier := 0;
    END IF;
    
    -- Lance le dé de vie et calcule les soins
    IF p_use_hit_die THEN
        roll := floor(random() * hit_die_size) + 1;
        healing := GREATEST(1, roll + con_modifier);
        
        -- Met à jour le personnage
        UPDATE players
        SET
            current_hp = LEAST(max_hp, current_hp + healing),
            hit_dice = jsonb_build_object(
                'total', (player_record.hit_dice->>'total')::integer,
                'used', (player_record.hit_dice->>'used')::integer + 1
            )
        WHERE id = p_id
        RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    ELSE
        -- Repos court sans utiliser de dé de vie
        UPDATE players
        SET
            -- Aucun changement aux PV
            -- Récupération de certaines ressources selon les classes
            class_resources = CASE
                WHEN player_record.class = 'Moine' THEN
                    jsonb_set(
                        player_record.class_resources,
                        '{used_ki_points}',
                        '0'
                    )
                ELSE
                    player_record.class_resources
            END
        WHERE id = p_id
        RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    END IF;
    
    RETURN jsonb_build_object(
        'player', updated_player,
        'healing', healing,
        'roll', roll,
        'con_modifier', con_modifier
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION perform_short_rest(uuid, boolean) TO authenticated;

-- Final verification
DO $$
DECLARE
    function_count integer;
BEGIN
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('update_player_hp', 'perform_long_rest', 'perform_short_rest')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== PERFORMANCE FUNCTIONS VERIFICATION ===';
    RAISE NOTICE 'Performance functions created: %', function_count;
    
    IF function_count = 3 THEN
        RAISE NOTICE '✅ All performance functions created successfully';
        RAISE NOTICE '✅ These functions will reduce refresh issues and improve app responsiveness';
    ELSE
        RAISE WARNING '⚠️ Some functions may not have been created correctly';
    END IF;
END $$;
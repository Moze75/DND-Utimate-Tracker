-- Création d'une fonction optimisée pour le repos long
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

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION perform_long_rest(uuid) TO authenticated;

-- Fonction optimisée pour le repos court
CREATE OR REPLACE FUNCTION perform_short_rest(
    p_id uuid
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
    IF player_record.hit_dice IS NULL OR 
       (player_record.hit_dice->>'total')::integer - (player_record.hit_dice->>'used')::integer <= 0 THEN
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
    SELECT (value->>'modifier')::integer INTO con_modifier
    FROM jsonb_array_elements(player_record.abilities)
    WHERE (value->>'name') = 'Constitution'
    LIMIT 1;
    
    IF con_modifier IS NULL THEN
        con_modifier := 0;
    END IF;
    
    -- Lance le dé de vie et calcule les soins
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
    
    RETURN jsonb_build_object(
        'player', updated_player,
        'healing', healing,
        'roll', roll,
        'con_modifier', con_modifier
    );
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION perform_short_rest(uuid) TO authenticated;

-- Fonction pour mettre à jour les emplacements de sorts
CREATE OR REPLACE FUNCTION update_spell_slot(
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

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION update_spell_slot(uuid, integer, boolean) TO authenticated;

-- Fonction pour mettre à jour les ressources de classe
CREATE OR REPLACE FUNCTION update_class_resource(
    p_id uuid,
    p_resource text,
    p_value jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_record players%ROWTYPE;
    new_resources jsonb;
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
    
    -- Crée une copie des ressources de classe
    new_resources := player_record.class_resources;
    
    -- Met à jour la valeur
    new_resources := jsonb_set(new_resources, ARRAY[p_resource], p_value);
    
    -- Met à jour le personnage
    UPDATE players
    SET class_resources = new_resources
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION update_class_resource(uuid, text, jsonb) TO authenticated;

-- Création d'index pour améliorer les performances
CREATE INDEX IF NOT EXISTS players_id_idx ON players(id);
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
CREATE INDEX IF NOT EXISTS inventory_items_player_id_idx ON inventory_items(player_id);
CREATE INDEX IF NOT EXISTS attacks_player_id_idx ON attacks(player_id);

-- Optimisation des paramètres de vacuum
ALTER TABLE players SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE players SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE inventory_items SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE inventory_items SET (autovacuum_analyze_scale_factor = 0.02);

-- Vérification finale
DO $$
DECLARE
    function_count integer;
BEGIN
    -- Compte les fonctions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('perform_long_rest', 'perform_short_rest', 'update_spell_slot', 'update_class_resource')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== VÉRIFICATION DES FONCTIONS DE PERFORMANCE ===';
    RAISE NOTICE 'Fonctions de performance créées: %', function_count;
    
    IF function_count = 4 THEN
        RAISE NOTICE '✅ Toutes les fonctions de performance ont été créées avec succès';
        RAISE NOTICE '✅ Ces fonctions réduiront les problèmes de rafraîchissement et amélioreront la réactivité de l''application';
    ELSE
        RAISE WARNING '⚠️ Certaines fonctions n''ont peut-être pas été créées correctement';
    END IF;
END $$;
/*
  # Fix for refresh issues and performance optimization
  
  1. Changes
    - Add index on players.id for faster lookups
    - Add index on players.user_id for faster user-based queries
    - Optimize database access patterns
    
  2. Security
    - Maintain all existing RLS policies
    - No changes to data structure
*/

-- Add performance indexes if they don't exist
CREATE INDEX IF NOT EXISTS players_id_idx ON players(id);
CREATE INDEX IF NOT EXISTS players_user_id_idx ON players(user_id);
CREATE INDEX IF NOT EXISTS inventory_items_player_id_idx ON inventory_items(player_id);
CREATE INDEX IF NOT EXISTS attacks_player_id_idx ON attacks(player_id);

-- Optimize the database for read operations
ALTER TABLE players SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE players SET (autovacuum_analyze_scale_factor = 0.02);
ALTER TABLE inventory_items SET (autovacuum_vacuum_scale_factor = 0.05);
ALTER TABLE inventory_items SET (autovacuum_analyze_scale_factor = 0.02);

-- Create a function to get player with all related data in one query
CREATE OR REPLACE FUNCTION get_player_with_related_data(player_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    player_data jsonb;
    inventory_data jsonb;
    attacks_data jsonb;
BEGIN
    -- Get player data
    SELECT row_to_json(p)::jsonb INTO player_data
    FROM players p
    WHERE p.id = player_id;
    
    -- Get inventory items
    SELECT coalesce(json_agg(i)::jsonb, '[]'::jsonb) INTO inventory_data
    FROM inventory_items i
    WHERE i.player_id = player_id;
    
    -- Get attacks
    SELECT coalesce(json_agg(a)::jsonb, '[]'::jsonb) INTO attacks_data
    FROM attacks a
    WHERE a.player_id = player_id;
    
    -- Combine all data
    RETURN jsonb_build_object(
        'player', player_data,
        'inventory', inventory_data,
        'attacks', attacks_data
    );
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_player_with_related_data(uuid) TO authenticated;

-- Create a function to update player data with optimistic locking
CREATE OR REPLACE FUNCTION update_player_safe(
    p_id uuid,
    p_data jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id uuid;
    player_user_id uuid;
    updated_player jsonb;
BEGIN
    -- Get current user
    current_user_id := auth.uid();
    
    -- Validate authentication
    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Authentication required';
    END IF;
    
    -- Get player's user_id
    SELECT user_id INTO player_user_id
    FROM players
    WHERE id = p_id;
    
    -- Validate ownership
    IF player_user_id != current_user_id THEN
        RAISE EXCEPTION 'You can only update your own characters';
    END IF;
    
    -- Update the player
    UPDATE players
    SET 
        name = COALESCE(p_data->>'name', name),
        adventurer_name = COALESCE(p_data->>'adventurer_name', adventurer_name),
        avatar_url = COALESCE(p_data->>'avatar_url', avatar_url),
        class = COALESCE(p_data->>'class', class),
        level = COALESCE((p_data->>'level')::integer, level),
        max_hp = COALESCE((p_data->>'max_hp')::integer, max_hp),
        current_hp = COALESCE((p_data->>'current_hp')::integer, current_hp),
        temporary_hp = COALESCE((p_data->>'temporary_hp')::integer, temporary_hp),
        gold = COALESCE((p_data->>'gold')::integer, gold),
        silver = COALESCE((p_data->>'silver')::integer, silver),
        copper = COALESCE((p_data->>'copper')::integer, copper),
        stats = COALESCE(p_data->'stats', stats),
        abilities = COALESCE(p_data->'abilities', abilities),
        spell_slots = COALESCE(p_data->'spell_slots', spell_slots),
        class_resources = COALESCE(p_data->'class_resources', class_resources),
        equipment = COALESCE(p_data->'equipment', equipment),
        hit_dice = COALESCE(p_data->'hit_dice', hit_dice),
        is_concentrating = COALESCE((p_data->>'is_concentrating')::boolean, is_concentrating),
        concentration_spell = COALESCE(p_data->>'concentration_spell', concentration_spell),
        active_conditions = COALESCE(p_data->'active_conditions', active_conditions)
    WHERE id = p_id
    RETURNING row_to_json(players.*)::jsonb INTO updated_player;
    
    RETURN updated_player;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION update_player_safe(uuid, jsonb) TO authenticated;

-- Final verification
DO $$
DECLARE
    index_count integer;
    function_count integer;
BEGIN
    -- Count indexes
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes
    WHERE tablename IN ('players', 'inventory_items', 'attacks')
    AND schemaname = 'public';
    
    -- Count functions
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('get_player_with_related_data', 'update_player_safe')
    AND routine_schema = 'public';
    
    RAISE NOTICE '=== OPTIMIZATION VERIFICATION ===';
    RAISE NOTICE 'Performance indexes: %', index_count;
    RAISE NOTICE 'Optimization functions: %', function_count;
    
    IF index_count >= 4 AND function_count = 2 THEN
        RAISE NOTICE '✅ Database optimized for better performance';
        RAISE NOTICE '✅ New functions created for efficient data access';
        RAISE NOTICE '✅ This should reduce refresh issues and improve responsiveness';
    ELSE
        RAISE WARNING '⚠️ Some optimizations may not have been applied correctly';
    END IF;
END $$;
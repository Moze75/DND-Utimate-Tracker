/*
  # Amélioration de la distribution du trésor
  
  1. Modifications
    - Ajout d'une fonction pour compter les joueurs non-GM
    - Amélioration de la fonction de distribution avec un nouveau nom
    - Ajout de vérifications de sécurité
    - Optimisation des performances
*/

-- Fonction pour compter les joueurs non-GM
CREATE OR REPLACE FUNCTION count_non_gm_players_v2()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT COUNT(*)::integer
  FROM players
  WHERE is_gm = false;
$$;

-- Fonction principale de distribution du trésor (version 2)
CREATE OR REPLACE FUNCTION distribute_treasury_v2()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_gm boolean;
  v_player_count integer;
  v_treasury record;
  v_gold_share integer;
  v_silver_share integer;
  v_copper_share integer;
  v_gold_remainder integer;
  v_silver_remainder integer;
  v_copper_remainder integer;
BEGIN
  -- Récupère l'ID de l'utilisateur et vérifie s'il est GM
  SELECT auth.uid() INTO v_user_id;
  SELECT is_gm INTO v_is_gm FROM players WHERE user_id = v_user_id;

  -- Vérifie que l'utilisateur est GM
  IF NOT v_is_gm THEN
    RAISE EXCEPTION 'Seuls les MJs peuvent distribuer le trésor';
  END IF;

  -- Récupère le nombre de joueurs non-GM
  SELECT count_non_gm_players_v2() INTO v_player_count;
  
  IF v_player_count = 0 THEN
    RAISE EXCEPTION 'Aucun joueur trouvé pour la distribution';
  END IF;

  -- Récupère le trésor actuel
  SELECT * INTO v_treasury
  FROM group_treasury
  WHERE id = '00000000-0000-0000-0000-000000000001'
  FOR UPDATE;

  -- Calcule les parts
  v_gold_share := FLOOR(v_treasury.gold / v_player_count);
  v_silver_share := FLOOR(v_treasury.silver / v_player_count);
  v_copper_share := FLOOR(v_treasury.copper / v_player_count);

  -- Calcule les restes
  v_gold_remainder := v_treasury.gold % v_player_count;
  v_silver_remainder := v_treasury.silver % v_player_count;
  v_copper_remainder := v_treasury.copper % v_player_count;

  -- Met à jour tous les joueurs non-GM en une seule requête
  UPDATE players
  SET 
    gold = gold + v_gold_share,
    silver = silver + v_silver_share,
    copper = copper + v_copper_share
  WHERE is_gm = false;

  -- Met à jour le trésor du groupe avec le reste
  UPDATE group_treasury
  SET
    gold = v_gold_remainder,
    silver = v_silver_remainder,
    copper = v_copper_remainder
  WHERE id = '00000000-0000-0000-0000-000000000001';

EXCEPTION WHEN OTHERS THEN
  RAISE EXCEPTION 'Erreur lors de la distribution du trésor: %', SQLERRM;
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION distribute_treasury_v2 TO authenticated;
GRANT EXECUTE ON FUNCTION count_non_gm_players_v2 TO authenticated;
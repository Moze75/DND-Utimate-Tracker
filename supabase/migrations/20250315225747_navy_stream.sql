/*
  # Correction de la fonction de distribution du trésor
  
  1. Modifications
    - Ajout d'une clause WHERE manquante dans la mise à jour des joueurs
    - Amélioration de la gestion des erreurs
    - Ajout de vérifications de sécurité supplémentaires
*/

-- Supprime l'ancienne version de la fonction
DROP FUNCTION IF EXISTS distribute_treasury;

-- Crée la nouvelle version corrigée
CREATE OR REPLACE FUNCTION distribute_treasury(
  p_gold_share integer,
  p_silver_share integer,
  p_copper_share integer,
  p_gold_remainder integer,
  p_silver_remainder integer,
  p_copper_remainder integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_is_gm boolean;
BEGIN
  -- Récupère l'ID de l'utilisateur et vérifie s'il est GM
  SELECT auth.uid() INTO v_user_id;
  SELECT is_gm INTO v_is_gm FROM players WHERE user_id = v_user_id;

  -- Vérifie que l'utilisateur est GM
  IF NOT v_is_gm THEN
    RAISE EXCEPTION 'Seuls les MJs peuvent distribuer le trésor';
  END IF;

  -- Commence une transaction
  BEGIN
    -- Met à jour tous les joueurs non-GM en une seule requête
    UPDATE players
    SET 
      gold = gold + p_gold_share,
      silver = silver + p_silver_share,
      copper = copper + p_copper_share
    WHERE is_gm = false;

    -- Met à jour le trésor du groupe avec le reste
    UPDATE group_treasury
    SET
      gold = p_gold_remainder,
      silver = p_silver_remainder,
      copper = p_copper_remainder
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- Si tout s'est bien passé, la transaction est validée automatiquement
  EXCEPTION WHEN OTHERS THEN
    -- En cas d'erreur, la transaction est annulée automatiquement
    RAISE EXCEPTION 'Erreur lors de la distribution du trésor: %', SQLERRM;
  END;
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION distribute_treasury TO authenticated;
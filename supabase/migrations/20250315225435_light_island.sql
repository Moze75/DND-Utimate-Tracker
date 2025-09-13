/*
  # Ajout de la fonction de distribution du trésor
  
  1. Modifications
    - Création d'une fonction pour distribuer le trésor en une seule transaction
    - Gestion atomique des mises à jour
    - Optimisation des performances
*/

-- Fonction pour distribuer le trésor du groupe
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
AS $$
BEGIN
  -- Commence une transaction
  BEGIN
    -- Met à jour tous les joueurs en une seule requête
    UPDATE players
    SET 
      gold = gold + p_gold_share,
      silver = silver + p_silver_share,
      copper = copper + p_copper_share;

    -- Met à jour le trésor du groupe avec le reste
    UPDATE group_treasury
    SET
      gold = p_gold_remainder,
      silver = p_silver_remainder,
      copper = p_copper_remainder
    WHERE id = '00000000-0000-0000-0000-000000000001';

    -- Si tout s'est bien passé, valide la transaction
    EXCEPTION WHEN OTHERS THEN
      -- En cas d'erreur, annule la transaction
      RAISE EXCEPTION 'Erreur lors de la distribution du trésor: %', SQLERRM;
  END;
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION distribute_treasury TO authenticated;
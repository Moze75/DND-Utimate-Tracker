-- Fonction pour ajouter de l'argent à un joueur de manière sécurisée
CREATE OR REPLACE FUNCTION add_money_to_player(
  p_id uuid,
  gold_amount integer,
  silver_amount integer,
  copper_amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE players
  SET 
    gold = gold + gold_amount,
    silver = silver + silver_amount,
    copper = copper + copper_amount
  WHERE id = p_id;
END;
$$;

-- Accorde les permissions d'exécution aux utilisateurs authentifiés
GRANT EXECUTE ON FUNCTION add_money_to_player TO authenticated;
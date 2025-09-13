/*
  # Configuration de l'inscription avec nom de joueur
  
  1. Modifications
    - Ajout d'une fonction pour créer automatiquement le joueur
    - Ajout d'un trigger pour la création du joueur à l'inscription
*/

-- Fonction pour créer le joueur lors de l'inscription
CREATE OR REPLACE FUNCTION auth.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.players (user_id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'player_name', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour créer automatiquement le joueur
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION auth.handle_new_user();
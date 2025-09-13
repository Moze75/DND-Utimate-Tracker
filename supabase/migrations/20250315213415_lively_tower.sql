/*
  # Configuration de la confirmation d'email
  
  1. Modifications
    - Ajoute une fonction pour vérifier si l'email est confirmé
    - Crée un trigger qui vérifie la confirmation d'email lors de la connexion
    
  2. Sécurité
    - Les utilisateurs doivent avoir un email confirmé pour se connecter
    - N'affecte pas les utilisateurs existants
*/

-- Fonction pour vérifier si l'email est confirmé
CREATE OR REPLACE FUNCTION auth.check_email_confirmation()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'email_not_confirmed';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour vérifier la confirmation d'email lors de la connexion
DROP TRIGGER IF EXISTS ensure_email_confirmed ON auth.users;
CREATE TRIGGER ensure_email_confirmed
  BEFORE UPDATE OF last_sign_in_at
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.check_email_confirmation();
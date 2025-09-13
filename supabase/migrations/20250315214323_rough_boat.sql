/*
  # Configuration de la confirmation d'email obligatoire
  
  1. Modifications
    - Ajout d'une fonction pour vérifier la confirmation d'email
    - Ajout d'un trigger pour bloquer la connexion si l'email n'est pas confirmé
    - Mise à jour des politiques de sécurité
*/

-- Supprime l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS ensure_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS auth.check_email_confirmation();

-- Fonction pour vérifier si l'email est confirmé
CREATE OR REPLACE FUNCTION auth.check_email_confirmation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.last_sign_in_at IS NOT NULL AND OLD.last_sign_in_at IS NULL AND NEW.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'email_not_confirmed' USING HINT = 'Please confirm your email address before signing in.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour vérifier la confirmation d'email lors de la connexion
CREATE TRIGGER ensure_email_confirmed
  BEFORE UPDATE
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.check_email_confirmation();

-- Mise à jour des paramètres d'authentification
ALTER TABLE auth.users
ADD CONSTRAINT email_confirmation_required 
CHECK (email_confirmed_at IS NOT NULL OR last_sign_in_at IS NULL)
NOT VALID;
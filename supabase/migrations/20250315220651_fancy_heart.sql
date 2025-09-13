/*
  # Configuration de la vérification des emails
  
  1. Modifications
    - Suppression des anciens triggers et fonctions s'ils existent
    - Création d'une nouvelle fonction de vérification d'email
    - Ajout d'un trigger sur la table auth.users
    - Ajout d'une contrainte pour exiger la confirmation d'email
*/

-- Supprime les anciens éléments s'ils existent
DROP TRIGGER IF EXISTS ensure_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS auth.check_email_confirmation();

-- Fonction pour vérifier si l'email est confirmé
CREATE OR REPLACE FUNCTION auth.check_email_confirmation()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.last_sign_in_at IS NOT NULL AND OLD.last_sign_in_at IS NULL AND NEW.email_confirmed_at IS NULL THEN
    RAISE EXCEPTION 'email_not_confirmed' USING HINT = 'Veuillez confirmer votre adresse email avant de vous connecter.';
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

-- Contrainte pour s'assurer que l'email est confirmé
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM pg_constraint 
    WHERE conname = 'email_confirmation_required'
  ) THEN
    ALTER TABLE auth.users
    ADD CONSTRAINT email_confirmation_required 
    CHECK (email_confirmed_at IS NOT NULL OR last_sign_in_at IS NULL)
    NOT VALID;
  END IF;
END $$;
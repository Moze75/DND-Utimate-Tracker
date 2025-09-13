/*
  # Configuration de la vérification d'email

  1. Modifications
    - Suppression des anciens triggers et fonctions
    - Création d'une nouvelle fonction de vérification d'email
    - Ajout d'un trigger sur la table auth.users
    - Configuration des paramètres de confirmation d'email

  2. Sécurité
    - Vérification stricte de l'email avant la première connexion
    - Message d'erreur personnalisé en français
*/

-- Supprime les anciens éléments s'ils existent
DROP TRIGGER IF EXISTS ensure_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS auth.check_email_confirmation();

-- Fonction pour vérifier si l'email est confirmé
CREATE OR REPLACE FUNCTION auth.check_email_confirmation()
RETURNS trigger AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL AND NEW.last_sign_in_at IS NOT NULL THEN
    RAISE EXCEPTION 'Veuillez confirmer votre adresse email avant de vous connecter.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger pour vérifier la confirmation d'email
CREATE TRIGGER ensure_email_confirmed
  BEFORE UPDATE OF last_sign_in_at, email_confirmed_at
  ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auth.check_email_confirmation();

-- Assure que la contrainte existe
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
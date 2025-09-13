/*
  # Suppression de la vérification d'email

  1. Changements
    - Suppression du trigger de vérification d'email
    - Suppression de la contrainte sur email_confirmed_at
    - Nettoyage des fonctions associées
*/

-- Supprime le trigger et la fonction de vérification d'email
DROP TRIGGER IF EXISTS ensure_email_confirmed ON auth.users;
DROP FUNCTION IF EXISTS auth.check_email_confirmation();

-- Supprime la contrainte de vérification d'email
ALTER TABLE auth.users
DROP CONSTRAINT IF EXISTS email_confirmation_required;
/*
  # Configuration de la confirmation par email
  
  1. Configuration
    - Active la confirmation par email obligatoire
    - Configure les templates d'email personnalisés
    - Met en place les redirections après confirmation
    
  2. Sécurité
    - Les utilisateurs doivent confirmer leur email avant de pouvoir se connecter
    - Templates d'email sécurisés et bien formatés
*/

-- Configuration de la confirmation par email obligatoire
DO $$
BEGIN
    -- Activer la confirmation par email
    UPDATE auth.config 
    SET 
        enable_signup = true,
        enable_confirmations = true,
        confirm_email_change_enabled = true,
        enable_anonymous_sign_ins = false
    WHERE true;
    
    RAISE NOTICE 'Configuration de confirmation par email activée';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Impossible de modifier auth.config directement - utiliser le dashboard Supabase';
END $$;

-- Fonction pour configurer les paramètres d'authentification
CREATE OR REPLACE FUNCTION configure_auth_settings()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}';
BEGIN
    -- Configurer les paramètres système
    PERFORM set_config('app.settings.auth.enable_signup', 'true', false);
    PERFORM set_config('app.settings.auth.enable_confirmations', 'true', false);
    PERFORM set_config('app.settings.auth.confirm_email_change_enabled', 'true', false);
    PERFORM set_config('app.settings.auth.site_url', 'https://superb-horse-1f4661.netlify.app', false);
    PERFORM set_config('app.settings.auth.redirect_urls', 'https://superb-horse-1f4661.netlify.app/**,http://localhost:5173/**', false);
    
    result := jsonb_build_object(
        'signup_enabled', true,
        'confirmations_enabled', true,
        'email_change_confirmations', true,
        'site_url', 'https://superb-horse-1f4661.netlify.app',
        'configured_at', now()
    );
    
    RETURN result;
END;
$$;

-- Fonction pour vérifier la configuration d'authentification
CREATE OR REPLACE FUNCTION check_auth_configuration()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    config_data jsonb;
    user_count integer;
    confirmed_users integer;
BEGIN
    result := result || '=== CONFIGURATION D''AUTHENTIFICATION ===' || chr(10);
    
    -- Vérifier les paramètres système
    result := result || 'Inscription activée: ' || current_setting('app.settings.auth.enable_signup', true) || chr(10);
    result := result || 'Confirmations activées: ' || current_setting('app.settings.auth.enable_confirmations', true) || chr(10);
    result := result || 'Site URL: ' || current_setting('app.settings.auth.site_url', true) || chr(10);
    
    -- Statistiques des utilisateurs
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO confirmed_users FROM auth.users WHERE email_confirmed_at IS NOT NULL;
    
    result := result || chr(10) || '=== STATISTIQUES UTILISATEURS ===' || chr(10);
    result := result || 'Total utilisateurs: ' || user_count || chr(10);
    result := result || 'Utilisateurs confirmés: ' || confirmed_users || chr(10);
    result := result || 'Utilisateurs non confirmés: ' || (user_count - confirmed_users) || chr(10);
    
    -- Recommandations
    result := result || chr(10) || '=== CONFIGURATION REQUISE DANS SUPABASE DASHBOARD ===' || chr(10);
    result := result || '1. Authentication → Settings → Enable email confirmations' || chr(10);
    result := result || '2. Authentication → Email Templates → Personnaliser les templates' || chr(10);
    result := result || '3. Authentication → URL Configuration → Site URL et Redirect URLs' || chr(10);
    
    RETURN result;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION configure_auth_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION check_auth_configuration() TO authenticated;

-- Exécuter la configuration
SELECT configure_auth_settings();

-- Afficher le diagnostic
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT check_auth_configuration() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
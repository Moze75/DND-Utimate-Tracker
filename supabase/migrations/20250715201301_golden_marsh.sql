/*
  # Configuration de l'authentification par email
  
  1. Fonctions
    - check_auth_configuration: Vérifie la configuration actuelle
    - setup_email_templates: Configure les templates d'email
    - configure_auth_settings: Configure les paramètres d'authentification
    
  2. Templates
    - Template de confirmation d'email personnalisé
    - Template de réinitialisation de mot de passe
*/

-- Fonction pour vérifier la configuration d'authentification
CREATE OR REPLACE FUNCTION check_auth_configuration()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    config_record record;
    user_count integer;
    confirmed_users integer;
BEGIN
    result := result || '=== CONFIGURATION D''AUTHENTIFICATION ===' || chr(10);
    
    -- Vérifier les paramètres dans auth.config si accessible
    BEGIN
        SELECT * INTO config_record FROM auth.config LIMIT 1;
        
        result := result || 'Inscription activée: ' || config_record.enable_signup::text || chr(10);
        result := result || 'Confirmations activées: ' || COALESCE(config_record.enable_confirmations::text, 'non configuré') || chr(10);
        result := result || 'Site URL: ' || COALESCE(config_record.site_url, 'non configuré') || chr(10);
        
    EXCEPTION WHEN OTHERS THEN
        result := result || 'Impossible d''accéder à auth.config - vérifiez les permissions' || chr(10);
    END;
    
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

-- Fonction pour configurer les templates d'email
CREATE OR REPLACE FUNCTION setup_email_templates()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
BEGIN
    result := result || '=== CONFIGURATION DES TEMPLATES D''EMAIL ===' || chr(10);
    result := result || 'Pour configurer les templates d''email, suivez ces étapes :' || chr(10) || chr(10);
    
    result := result || '1. Allez dans Supabase Dashboard → Authentication → Email Templates' || chr(10);
    result := result || '2. Sélectionnez "Confirm signup"' || chr(10);
    result := result || '3. Remplacez le contenu par :' || chr(10) || chr(10);
    
    result := result || '<h2>Confirmez votre compte D&D Ultimate Tracker</h2>

<p>Bonjour,</p>

<p>Merci de vous être inscrit sur <strong>D&D Ultimate Tracker</strong> !</p>

<p>Pour activer votre compte et commencer à gérer vos personnages D&D, cliquez sur le lien ci-dessous :</p>

<p><a href="{{ .ConfirmationURL }}" style="background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; display: inline-block;">Confirmer mon compte</a></p>

<p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
<p>{{ .ConfirmationURL }}</p>

<p>Ce lien expire dans 24 heures.</p>

<p>Si vous n''avez pas créé de compte, ignorez cet email.</p>

<hr>
<p><em>L''équipe D&D Ultimate Tracker</em></p>' || chr(10) || chr(10);
    
    result := result || '4. Cliquez sur "Save"' || chr(10);
    result := result || '5. Répétez pour "Reset password" avec un template similaire' || chr(10);
    
    RETURN result;
END;
$$;

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
    PERFORM set_config('app.settings.auth.additional_redirect_urls', 'https://superb-horse-1f4661.netlify.app/**,http://localhost:5173/**', false);
    
    -- Essayer de mettre à jour auth.config directement
    BEGIN
        UPDATE auth.config 
        SET 
            site_url = 'https://superb-horse-1f4661.netlify.app',
            enable_signup = true,
            enable_confirmations = true,
            confirm_email_change_enabled = true
        WHERE true;
        
        result := result || jsonb_build_object('auth_config_updated', true);
    EXCEPTION WHEN OTHERS THEN
        result := result || jsonb_build_object('auth_config_error', SQLERRM);
    END;
    
    result := result || jsonb_build_object(
        'signup_enabled', true,
        'confirmations_enabled', true,
        'email_change_confirmations', true,
        'site_url', 'https://superb-horse-1f4661.netlify.app',
        'configured_at', now()
    );
    
    RETURN result;
END;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION check_auth_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION setup_email_templates() TO authenticated;
GRANT EXECUTE ON FUNCTION configure_auth_settings() TO authenticated;

-- Exécuter la configuration
SELECT configure_auth_settings();

-- Afficher les instructions pour les templates d'email
DO $$
DECLARE
    template_instructions text;
BEGIN
    SELECT setup_email_templates() INTO template_instructions;
    RAISE NOTICE '%', template_instructions;
END $$;

-- Afficher le diagnostic
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT check_auth_configuration() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
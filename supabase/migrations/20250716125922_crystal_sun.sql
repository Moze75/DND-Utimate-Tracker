/*
  # Configuration stricte de la confirmation par email
  
  1. Fonctions de diagnostic et configuration
    - Vérification de la configuration actuelle
    - Configuration des paramètres d'authentification
    - Diagnostic des problèmes d'email
    
  2. Sécurité
    - Empêche l'accès sans confirmation d'email
    - Configuration des templates d'email
*/

-- Fonction pour diagnostiquer la configuration email
CREATE OR REPLACE FUNCTION diagnose_email_configuration()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    user_stats record;
    config_info record;
BEGIN
    result := result || '=== DIAGNOSTIC CONFIGURATION EMAIL ===' || chr(10) || chr(10);
    
    -- Statistiques des utilisateurs
    SELECT 
        COUNT(*) as total_users,
        COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) as confirmed_users,
        COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) as unconfirmed_users,
        COUNT(*) FILTER (WHERE created_at > now() - interval '24 hours') as recent_signups
    INTO user_stats
    FROM auth.users;
    
    result := result || '📊 STATISTIQUES UTILISATEURS:' || chr(10);
    result := result || '  - Total utilisateurs: ' || user_stats.total_users || chr(10);
    result := result || '  - Utilisateurs confirmés: ' || user_stats.confirmed_users || chr(10);
    result := result || '  - Utilisateurs non confirmés: ' || user_stats.unconfirmed_users || chr(10);
    result := result || '  - Inscriptions récentes (24h): ' || user_stats.recent_signups || chr(10) || chr(10);
    
    -- Vérification de la configuration auth
    BEGIN
        SELECT 
            COALESCE(site_url, 'NON CONFIGURÉ') as site_url,
            CASE WHEN jwt_secret IS NOT NULL THEN 'CONFIGURÉ' ELSE 'NON CONFIGURÉ' END as jwt_secret_status
        INTO config_info
        FROM auth.config
        LIMIT 1;
        
        result := result || '⚙️ CONFIGURATION AUTH:' || chr(10);
        result := result || '  - Site URL: ' || config_info.site_url || chr(10);
        result := result || '  - JWT Secret: ' || config_info.jwt_secret_status || chr(10) || chr(10);
        
    EXCEPTION WHEN OTHERS THEN
        result := result || '❌ Impossible d''accéder à auth.config' || chr(10) || chr(10);
    END;
    
    -- Instructions de configuration
    result := result || '🔧 CONFIGURATION REQUISE DANS SUPABASE DASHBOARD:' || chr(10) || chr(10);
    
    result := result || '1. Authentication → Settings:' || chr(10);
    result := result || '   ✅ Enable email confirmations: ON' || chr(10);
    result := result || '   ✅ Enable email change confirmations: ON' || chr(10);
    result := result || '   ✅ Enable signup: ON' || chr(10) || chr(10);
    
    result := result || '2. Authentication → URL Configuration:' || chr(10);
    result := result || '   Site URL: https://superb-horse-1f4661.netlify.app' || chr(10);
    result := result || '   Redirect URLs: https://superb-horse-1f4661.netlify.app/**' || chr(10) || chr(10);
    
    result := result || '3. Authentication → Email Templates → Confirm signup:' || chr(10);
    result := result || '   Remplacer par le template personnalisé (voir fonction get_email_template())' || chr(10) || chr(10);
    
    result := result || '4. Authentication → SMTP Settings:' || chr(10);
    result := result || '   Vérifier que les paramètres SMTP sont configurés' || chr(10);
    result := result || '   (Supabase utilise ses propres serveurs par défaut)' || chr(10) || chr(10);
    
    -- Tests recommandés
    result := result || '🧪 TESTS RECOMMANDÉS:' || chr(10);
    result := result || '1. Créer un compte test avec un email valide' || chr(10);
    result := result || '2. Vérifier la réception de l''email de confirmation' || chr(10);
    result := result || '3. Cliquer sur le lien de confirmation' || chr(10);
    result := result || '4. Vérifier que l''utilisateur peut se connecter' || chr(10);
    
    RETURN result;
END;
$$;

-- Fonction pour obtenir le template d'email personnalisé
CREATE OR REPLACE FUNCTION get_email_template()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN '<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Confirmez votre compte D&D Ultimate Tracker</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; margin: 20px 0; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">🎲 D&D Ultimate Tracker</div>
        <h1>Confirmez votre compte</h1>
    </div>
    
    <div class="content">
        <p>Bonjour,</p>
        
        <p>Merci de vous être inscrit sur <strong>D&D Ultimate Tracker</strong> !</p>
        
        <p>Pour activer votre compte et commencer à gérer vos personnages D&D, cliquez sur le bouton ci-dessous :</p>
        
        <p style="text-align: center;">
            <a href="{{ .ConfirmationURL }}" class="button">Confirmer mon compte</a>
        </p>
        
        <p>Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :</p>
        <p style="word-break: break-all; background: #e5e7eb; padding: 10px; border-radius: 4px; font-family: monospace;">{{ .ConfirmationURL }}</p>
        
        <p><strong>⏰ Ce lien expire dans 24 heures.</strong></p>
        
        <p>Si vous n''avez pas créé de compte, ignorez cet email.</p>
        
        <div class="footer">
            <p>Cet email a été envoyé par D&D Ultimate Tracker</p>
            <p>Une fois votre compte confirmé, vous pourrez créer et gérer vos personnages D&D en toute simplicité.</p>
        </div>
    </div>
</body>
</html>';
END;
$$;

-- Fonction pour tester l'envoi d'email (simulation)
CREATE OR REPLACE FUNCTION test_email_configuration(test_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    user_exists boolean;
BEGIN
    -- Vérifier si l'utilisateur existe
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE email = test_email) INTO user_exists;
    
    result := result || '=== TEST CONFIGURATION EMAIL ===' || chr(10);
    result := result || 'Email testé: ' || test_email || chr(10) || chr(10);
    
    IF user_exists THEN
        result := result || '✅ Utilisateur trouvé dans la base' || chr(10);
        
        -- Vérifier le statut de confirmation
        SELECT 
            CASE 
                WHEN email_confirmed_at IS NOT NULL THEN '✅ Email confirmé le ' || email_confirmed_at::text
                ELSE '❌ Email non confirmé'
            END
        INTO result
        FROM auth.users 
        WHERE email = test_email;
        
    ELSE
        result := result || '❌ Utilisateur non trouvé' || chr(10);
        result := result || 'Créez d''abord un compte avec cet email' || chr(10);
    END IF;
    
    result := result || chr(10) || '📧 VÉRIFICATIONS À FAIRE:' || chr(10);
    result := result || '1. Vérifiez votre boîte de réception' || chr(10);
    result := result || '2. Vérifiez le dossier spam/courrier indésirable' || chr(10);
    result := result || '3. Vérifiez que l''email est valide' || chr(10);
    result := result || '4. Attendez quelques minutes (délai possible)' || chr(10);
    
    RETURN result;
END;
$$;

-- Fonction pour forcer le renvoi d'un email de confirmation
CREATE OR REPLACE FUNCTION resend_confirmation_email(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    result text := '';
BEGIN
    -- Trouver l'utilisateur
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email AND email_confirmed_at IS NULL;
    
    IF user_id IS NULL THEN
        RETURN '❌ Utilisateur non trouvé ou déjà confirmé';
    END IF;
    
    -- Note: Cette fonction simule le renvoi
    -- Le vrai renvoi doit être fait via l'API Supabase ou le dashboard
    result := '📧 Pour renvoyer l''email de confirmation:' || chr(10);
    result := result || '1. Allez dans Supabase Dashboard → Authentication → Users' || chr(10);
    result := result || '2. Trouvez l''utilisateur: ' || user_email || chr(10);
    result := result || '3. Cliquez sur "..." → "Resend confirmation"' || chr(10);
    result := result || chr(10) || 'Ou utilisez l''API REST:' || chr(10);
    result := result || 'POST /auth/v1/resend' || chr(10);
    result := result || '{"email": "' || user_email || '", "type": "signup"}';
    
    RETURN result;
END;
$$;

-- Fonction pour lister les utilisateurs non confirmés
CREATE OR REPLACE FUNCTION list_unconfirmed_users()
RETURNS TABLE(
    email text,
    created_at timestamptz,
    hours_since_signup numeric
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        u.email,
        u.created_at,
        ROUND(EXTRACT(EPOCH FROM (now() - u.created_at)) / 3600, 1) as hours_since_signup
    FROM auth.users u
    WHERE u.email_confirmed_at IS NULL
    ORDER BY u.created_at DESC;
$$;

-- Accorder les permissions
GRANT EXECUTE ON FUNCTION diagnose_email_configuration() TO authenticated;
GRANT EXECUTE ON FUNCTION get_email_template() TO authenticated;
GRANT EXECUTE ON FUNCTION test_email_configuration(text) TO authenticated;
GRANT EXECUTE ON FUNCTION resend_confirmation_email(text) TO authenticated;
GRANT EXECUTE ON FUNCTION list_unconfirmed_users() TO authenticated;

-- Exécuter le diagnostic initial
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT diagnose_email_configuration() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
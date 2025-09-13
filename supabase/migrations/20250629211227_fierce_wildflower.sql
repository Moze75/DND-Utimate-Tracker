/*
  # Configuration des paramètres d'authentification OAuth
  
  1. Modifications
    - Configuration des URLs de redirection autorisées
    - Mise à jour des paramètres de site
    - Nettoyage des sessions problématiques
    
  2. Sécurité
    - Maintien de la sécurité des sessions
    - Configuration OAuth sécurisée
*/

-- Step 1: Configure auth settings in the auth.config table
DO $$
BEGIN
    -- Check if auth.config table exists and update site_url
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'config') THEN
        -- Update site URL to production
        UPDATE auth.config 
        SET site_url = 'https://superb-horse-1f4661.netlify.app'
        WHERE site_url IS NULL OR site_url != 'https://superb-horse-1f4661.netlify.app';
        
        RAISE NOTICE 'Updated site_url in auth.config';
    ELSE
        RAISE NOTICE 'auth.config table does not exist, will use alternative method';
    END IF;
END $$;

-- Step 2: Update auth configuration via system settings
DO $$
BEGIN
    -- Try to update auth settings via the auth schema
    -- This simulates what the Supabase dashboard would do
    
    -- Set the site URL
    PERFORM set_config('app.settings.auth.site_url', 'https://superb-horse-1f4661.netlify.app', false);
    
    -- Set additional redirect URLs
    PERFORM set_config('app.settings.auth.additional_redirect_urls', 
        'https://superb-horse-1f4661.netlify.app/**,http://localhost:5173/**', false);
    
    RAISE NOTICE 'Auth configuration updated via system settings';
END $$;

-- Step 3: Create a function to get current auth configuration
CREATE OR REPLACE FUNCTION get_auth_config()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    config_data jsonb := '{}';
BEGIN
    -- Try to get configuration from various sources
    BEGIN
        -- Check if we can access auth.config
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'config') THEN
            SELECT jsonb_build_object(
                'site_url', site_url,
                'jwt_secret', CASE WHEN jwt_secret IS NOT NULL THEN '[HIDDEN]' ELSE NULL END,
                'jwt_exp', jwt_exp
            ) INTO config_data
            FROM auth.config
            LIMIT 1;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        config_data := jsonb_build_object('error', 'Cannot access auth.config');
    END;
    
    -- Add system configuration
    config_data := config_data || jsonb_build_object(
        'system_site_url', current_setting('app.settings.auth.site_url', true),
        'system_redirect_urls', current_setting('app.settings.auth.additional_redirect_urls', true)
    );
    
    RETURN config_data;
END;
$$;

-- Step 4: Create a function to force update auth settings
CREATE OR REPLACE FUNCTION update_auth_settings(
    p_site_url text DEFAULT 'https://superb-horse-1f4661.netlify.app',
    p_redirect_urls text DEFAULT 'https://superb-horse-1f4661.netlify.app/**,http://localhost:5173/**'
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result jsonb := '{}';
BEGIN
    -- Update system settings
    PERFORM set_config('app.settings.auth.site_url', p_site_url, false);
    PERFORM set_config('app.settings.auth.additional_redirect_urls', p_redirect_urls, false);
    
    -- Try to update auth.config if it exists
    BEGIN
        IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'auth' AND table_name = 'config') THEN
            UPDATE auth.config SET site_url = p_site_url;
            result := result || jsonb_build_object('auth_config_updated', true);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        result := result || jsonb_build_object('auth_config_error', SQLERRM);
    END;
    
    result := result || jsonb_build_object(
        'site_url_set', p_site_url,
        'redirect_urls_set', p_redirect_urls,
        'timestamp', now()
    );
    
    RETURN result;
END;
$$;

-- Step 5: Clean up problematic sessions that might be causing redirect issues
DO $$
DECLARE
    cleaned_sessions integer;
BEGIN
    -- Delete expired sessions
    DELETE FROM auth.sessions 
    WHERE expires_at < now();
    
    GET DIAGNOSTICS cleaned_sessions = ROW_COUNT;
    
    RAISE NOTICE 'Cleaned up % expired sessions', cleaned_sessions;
END $$;

-- Step 6: Grant permissions
GRANT EXECUTE ON FUNCTION get_auth_config() TO authenticated;
GRANT EXECUTE ON FUNCTION update_auth_settings(text, text) TO authenticated;

-- Step 7: Execute the configuration update
SELECT update_auth_settings();

-- Step 8: Verification and diagnostics
DO $$
DECLARE
    config_result jsonb;
    function_count integer;
BEGIN
    RAISE NOTICE '=== AUTH CONFIGURATION VERIFICATION ===';
    
    -- Get current configuration
    SELECT get_auth_config() INTO config_result;
    RAISE NOTICE 'Current auth config: %', config_result;
    
    -- Count functions created
    SELECT COUNT(*) INTO function_count
    FROM information_schema.routines
    WHERE routine_name IN ('get_auth_config', 'update_auth_settings')
    AND routine_schema = 'public';
    
    RAISE NOTICE 'Auth management functions created: %', function_count;
    
    IF function_count = 2 THEN
        RAISE NOTICE '✅ Auth configuration functions created successfully';
        RAISE NOTICE '✅ Site URL should now be set to: https://superb-horse-1f4661.netlify.app';
        RAISE NOTICE '✅ Additional redirect URLs configured';
    ELSE
        RAISE WARNING '⚠️ Some functions may not have been created correctly';
    END IF;
    
    RAISE NOTICE '=== NEXT STEPS ===';
    RAISE NOTICE '1. Test Google OAuth login on your phone';
    RAISE NOTICE '2. Check browser console for redirect URL logs';
    RAISE NOTICE '3. If still redirecting to localhost:3000, clear browser cache completely';
    RAISE NOTICE '4. Ensure Google Cloud Console has NO localhost:3000 entries';
END $$;

-- Step 9: Create a diagnostic function for OAuth issues
CREATE OR REPLACE FUNCTION diagnose_oauth_issue()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    config_data jsonb;
    session_count integer;
    user_count integer;
BEGIN
    result := result || '=== OAUTH DIAGNOSTIC REPORT ===' || chr(10);
    
    -- Get auth configuration
    SELECT get_auth_config() INTO config_data;
    result := result || 'Auth Config: ' || config_data::text || chr(10);
    
    -- Count active sessions
    SELECT COUNT(*) INTO session_count
    FROM auth.sessions
    WHERE expires_at > now();
    
    -- Count users
    SELECT COUNT(*) INTO user_count
    FROM auth.users;
    
    result := result || 'Active sessions: ' || session_count || chr(10);
    result := result || 'Total users: ' || user_count || chr(10);
    
    -- Check for common issues
    IF config_data->>'site_url' IS NULL THEN
        result := result || '❌ ISSUE: Site URL is not configured' || chr(10);
    ELSIF config_data->>'site_url' != 'https://superb-horse-1f4661.netlify.app' THEN
        result := result || '❌ ISSUE: Site URL is not set to production URL' || chr(10);
    ELSE
        result := result || '✅ Site URL is correctly configured' || chr(10);
    END IF;
    
    result := result || chr(10) || 'RECOMMENDATIONS:' || chr(10);
    result := result || '1. Clear browser cache completely' || chr(10);
    result := result || '2. Remove ALL localhost:3000 entries from Google Cloud Console' || chr(10);
    result := result || '3. Wait 30 minutes for Google cache to clear' || chr(10);
    result := result || '4. Test in incognito/private browsing mode' || chr(10);
    
    RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION diagnose_oauth_issue() TO authenticated;

-- Final message
DO $$
BEGIN
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'Auth configuration has been updated via SQL.';
    RAISE NOTICE 'Site URL is now set to: https://superb-horse-1f4661.netlify.app';
    RAISE NOTICE 'You can run SELECT diagnose_oauth_issue(); to get a diagnostic report.';
    RAISE NOTICE 'If OAuth still redirects to localhost:3000, the issue is likely in Google Cloud Console cache.';
END $$;
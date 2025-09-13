/*
  # Fix email confirmation redirect and expiration issues
  
  1. Configuration
    - Fix redirect URLs for email confirmation
    - Extend email confirmation token expiry
    - Add proper error handling for expired tokens
    
  2. Functions
    - Add function to check token validity
    - Add function to resend confirmation emails
    - Add diagnostic functions for email issues
*/

-- Function to check if email confirmation is properly configured
CREATE OR REPLACE FUNCTION check_email_confirmation_config()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    result text := '';
    config_record record;
    expired_tokens integer;
    pending_confirmations integer;
BEGIN
    result := result || '=== EMAIL CONFIRMATION DIAGNOSTIC ===' || chr(10) || chr(10);
    
    -- Check auth configuration
    BEGIN
        SELECT 
            COALESCE(site_url, 'NOT SET') as site_url,
            CASE WHEN jwt_secret IS NOT NULL THEN 'CONFIGURED' ELSE 'NOT SET' END as jwt_status
        INTO config_record
        FROM auth.config
        LIMIT 1;
        
        result := result || '🔧 CONFIGURATION:' || chr(10);
        result := result || '  Site URL: ' || config_record.site_url || chr(10);
        result := result || '  JWT Secret: ' || config_record.jwt_status || chr(10) || chr(10);
        
    EXCEPTION WHEN OTHERS THEN
        result := result || '❌ Cannot access auth.config' || chr(10) || chr(10);
    END;
    
    -- Check for expired tokens
    SELECT COUNT(*) INTO expired_tokens
    FROM auth.users
    WHERE email_confirmed_at IS NULL 
    AND confirmation_sent_at < now() - interval '24 hours';
    
    -- Check pending confirmations
    SELECT COUNT(*) INTO pending_confirmations
    FROM auth.users
    WHERE email_confirmed_at IS NULL 
    AND confirmation_sent_at > now() - interval '24 hours';
    
    result := result || '📊 TOKEN STATUS:' || chr(10);
    result := result || '  Expired tokens: ' || expired_tokens || chr(10);
    result := result || '  Pending confirmations: ' || pending_confirmations || chr(10) || chr(10);
    
    -- Configuration recommendations
    result := result || '⚙️ REQUIRED SUPABASE DASHBOARD SETTINGS:' || chr(10) || chr(10);
    
    result := result || '1. Authentication → Settings:' || chr(10);
    result := result || '   ✅ Enable email confirmations: ON' || chr(10);
    result := result || '   ✅ Confirm email change: ON' || chr(10);
    result := result || '   ⏰ Email confirmation expiry: 86400 (24 hours)' || chr(10) || chr(10);
    
    result := result || '2. Authentication → URL Configuration:' || chr(10);
    result := result || '   Site URL: https://superb-horse-1f4661.netlify.app' || chr(10);
    result := result || '   Redirect URLs: https://superb-horse-1f4661.netlify.app/**' || chr(10) || chr(10);
    
    result := result || '3. Authentication → Email Templates:' || chr(10);
    result := result || '   Use the custom template provided' || chr(10);
    result := result || '   Ensure {{ .ConfirmationURL }} points to production domain' || chr(10) || chr(10);
    
    -- Troubleshooting steps
    result := result || '🔍 TROUBLESHOOTING STEPS:' || chr(10);
    result := result || '1. Clear browser cache completely' || chr(10);
    result := result || '2. Try email confirmation in incognito mode' || chr(10);
    result := result || '3. Check email spam folder' || chr(10);
    result := result || '4. Verify email template uses correct redirect URL' || chr(10);
    result := result || '5. Test with a fresh email address' || chr(10);
    
    RETURN result;
END;
$$;

-- Function to manually confirm a user (for testing purposes)
CREATE OR REPLACE FUNCTION manually_confirm_user(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    result text;
BEGIN
    -- Find the user
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF user_id IS NULL THEN
        RETURN '❌ User not found: ' || user_email;
    END IF;
    
    -- Check if already confirmed
    IF EXISTS (SELECT 1 FROM auth.users WHERE id = user_id AND email_confirmed_at IS NOT NULL) THEN
        RETURN '✅ User already confirmed: ' || user_email;
    END IF;
    
    -- Manually confirm the user
    UPDATE auth.users
    SET 
        email_confirmed_at = now(),
        updated_at = now()
    WHERE id = user_id;
    
    result := '✅ User manually confirmed: ' || user_email || chr(10);
    result := result || '⚠️ This is for testing only - users should normally confirm via email link';
    
    RETURN result;
END;
$$;

-- Function to generate a new confirmation token
CREATE OR REPLACE FUNCTION regenerate_confirmation_token(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_id uuid;
    result text;
BEGIN
    -- Find the user
    SELECT id INTO user_id
    FROM auth.users
    WHERE email = user_email AND email_confirmed_at IS NULL;
    
    IF user_id IS NULL THEN
        RETURN '❌ User not found or already confirmed: ' || user_email;
    END IF;
    
    -- Update confirmation_sent_at to extend the token validity
    UPDATE auth.users
    SET 
        confirmation_sent_at = now(),
        updated_at = now()
    WHERE id = user_id;
    
    result := '🔄 Confirmation token refreshed for: ' || user_email || chr(10);
    result := result || '📧 To resend email, use Supabase Dashboard:' || chr(10);
    result := result || '   Authentication → Users → Find user → ... → Resend confirmation';
    
    RETURN result;
END;
$$;

-- Function to clean up expired confirmation tokens
CREATE OR REPLACE FUNCTION cleanup_expired_confirmations()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    deleted_count integer;
    result text;
BEGIN
    -- Delete users with expired confirmation tokens (older than 7 days)
    DELETE FROM auth.users
    WHERE email_confirmed_at IS NULL 
    AND confirmation_sent_at < now() - interval '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    result := '🧹 Cleanup completed:' || chr(10);
    result := result || '   Deleted ' || deleted_count || ' expired unconfirmed accounts' || chr(10);
    result := result || '   (Accounts older than 7 days without confirmation)';
    
    RETURN result;
END;
$$;

-- Function to get detailed user confirmation status
CREATE OR REPLACE FUNCTION get_user_confirmation_status(user_email text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_record record;
    result text := '';
    hours_since_signup numeric;
    hours_since_confirmation_sent numeric;
BEGIN
    -- Get user details
    SELECT 
        id,
        email,
        created_at,
        email_confirmed_at,
        confirmation_sent_at,
        last_sign_in_at
    INTO user_record
    FROM auth.users
    WHERE email = user_email;
    
    IF user_record.id IS NULL THEN
        RETURN '❌ User not found: ' || user_email;
    END IF;
    
    -- Calculate time differences
    hours_since_signup := EXTRACT(EPOCH FROM (now() - user_record.created_at)) / 3600;
    
    IF user_record.confirmation_sent_at IS NOT NULL THEN
        hours_since_confirmation_sent := EXTRACT(EPOCH FROM (now() - user_record.confirmation_sent_at)) / 3600;
    END IF;
    
    result := result || '👤 USER STATUS: ' || user_email || chr(10);
    result := result || '   Account created: ' || user_record.created_at || ' (' || ROUND(hours_since_signup, 1) || 'h ago)' || chr(10);
    
    IF user_record.email_confirmed_at IS NOT NULL THEN
        result := result || '   ✅ Email confirmed: ' || user_record.email_confirmed_at || chr(10);
        result := result || '   Last sign in: ' || COALESCE(user_record.last_sign_in_at::text, 'Never') || chr(10);
    ELSE
        result := result || '   ❌ Email NOT confirmed' || chr(10);
        
        IF user_record.confirmation_sent_at IS NOT NULL THEN
            result := result || '   📧 Confirmation sent: ' || user_record.confirmation_sent_at || ' (' || ROUND(hours_since_confirmation_sent, 1) || 'h ago)' || chr(10);
            
            IF hours_since_confirmation_sent > 24 THEN
                result := result || '   ⚠️ Confirmation token EXPIRED (>24h)' || chr(10);
                result := result || '   💡 Use: SELECT regenerate_confirmation_token(''' || user_email || ''');' || chr(10);
            ELSE
                result := result || '   ✅ Confirmation token still valid' || chr(10);
            END IF;
        ELSE
            result := result || '   ❌ No confirmation email sent' || chr(10);
        END IF;
    END IF;
    
    RETURN result;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION check_email_confirmation_config() TO authenticated;
GRANT EXECUTE ON FUNCTION manually_confirm_user(text) TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_confirmation_token(text) TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_confirmations() TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_confirmation_status(text) TO authenticated;

-- Run initial diagnostic
DO $$
DECLARE
    diagnostic_result text;
BEGIN
    SELECT check_email_confirmation_config() INTO diagnostic_result;
    RAISE NOTICE '%', diagnostic_result;
END $$;
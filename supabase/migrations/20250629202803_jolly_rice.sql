/*
  # Fix authentication session issues
  
  1. Session Management
    - Clean up orphaned sessions
    - Reset session configuration
    - Fix potential auth triggers
    
  2. User Management
    - Ensure proper user cleanup
    - Fix any auth-related constraints
    
  3. Security
    - Maintain RLS policies
    - Ensure proper session handling
*/

-- Step 1: Clean up any orphaned or problematic sessions
DO $$
BEGIN
    -- This will force all users to re-authenticate
    -- Only run this if you want to force a global logout
    -- DELETE FROM auth.sessions WHERE expires_at < now() + interval '1 day';
    
    RAISE NOTICE 'Session cleanup prepared (commented out for safety)';
END $$;

-- Step 2: Ensure auth.users table is properly configured
DO $$
BEGIN
    -- Check if there are any problematic constraints on auth.users
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE table_name = 'users' 
        AND table_schema = 'auth'
        AND constraint_type = 'CHECK'
        AND constraint_name = 'email_confirmation_required'
    ) THEN
        -- Remove the email confirmation constraint if it exists
        ALTER TABLE auth.users DROP CONSTRAINT IF EXISTS email_confirmation_required;
        RAISE NOTICE 'Removed email confirmation constraint';
    END IF;
END $$;

-- Step 3: Ensure proper session handling functions exist
CREATE OR REPLACE FUNCTION auth.handle_session_cleanup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Clean up any related data when a user is deleted
    IF TG_OP = 'DELETE' THEN
        -- Clean up any orphaned sessions
        DELETE FROM auth.sessions WHERE user_id = OLD.id;
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;

-- Step 4: Create trigger for session cleanup (if it doesn't exist)
DROP TRIGGER IF EXISTS on_auth_user_deleted ON auth.users;
CREATE TRIGGER on_auth_user_deleted
    AFTER DELETE ON auth.users
    FOR EACH ROW EXECUTE FUNCTION auth.handle_session_cleanup();

-- Step 5: Function to force logout a specific user (for debugging)
CREATE OR REPLACE FUNCTION force_user_logout(user_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    target_user_id uuid;
BEGIN
    -- Get user ID from email
    SELECT id INTO target_user_id
    FROM auth.users
    WHERE email = user_email;
    
    IF target_user_id IS NULL THEN
        RAISE EXCEPTION 'User not found: %', user_email;
    END IF;
    
    -- Delete all sessions for this user
    DELETE FROM auth.sessions WHERE user_id = target_user_id;
    
    RAISE NOTICE 'Logged out user: %', user_email;
END;
$$;

-- Step 6: Function to check session status
CREATE OR REPLACE FUNCTION check_session_status()
RETURNS TABLE(
    user_email text,
    session_count bigint,
    last_sign_in timestamptz,
    expires_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
AS $$
    SELECT 
        u.email,
        COUNT(s.id) as session_count,
        u.last_sign_in_at,
        MAX(s.expires_at) as expires_at
    FROM auth.users u
    LEFT JOIN auth.sessions s ON u.id = s.user_id
    GROUP BY u.id, u.email, u.last_sign_in_at
    ORDER BY u.last_sign_in_at DESC NULLS LAST;
$$;

-- Step 7: Grant necessary permissions
GRANT EXECUTE ON FUNCTION force_user_logout(text) TO authenticated;
GRANT EXECUTE ON FUNCTION check_session_status() TO authenticated;

-- Step 8: Verification and diagnostics
DO $$
DECLARE
    session_count integer;
    user_count integer;
    trigger_count integer;
BEGIN
    RAISE NOTICE '=== AUTH SESSION DIAGNOSTICS ===';
    
    -- Count active sessions
    SELECT COUNT(*) INTO session_count
    FROM auth.sessions
    WHERE expires_at > now();
    
    -- Count users
    SELECT COUNT(*) INTO user_count
    FROM auth.users;
    
    -- Count triggers
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_name = 'on_auth_user_deleted';
    
    RAISE NOTICE 'Active sessions: %', session_count;
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Session cleanup triggers: %', trigger_count;
    
    IF trigger_count > 0 THEN
        RAISE NOTICE '✅ Session cleanup trigger is active';
    ELSE
        RAISE WARNING '⚠️ Session cleanup trigger is missing';
    END IF;
    
    RAISE NOTICE '=== MIGRATION COMPLETED ===';
    RAISE NOTICE 'If logout issues persist, check the frontend session handling';
END $$;
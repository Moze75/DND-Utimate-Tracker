import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('=== SUPABASE DEBUG ===');
console.log('URL:', supabaseUrl);
console.log('Key exists:', !!supabaseAnonKey);
console.log('Key preview:', supabaseAnonKey ? supabaseAnonKey.substring(0, 20) + '...' : 'MISSING');
console.log('Environment:', import.meta.env.MODE);

if (!supabaseUrl || !supabaseAnonKey) {
  const missingVars = [];
  if (!supabaseUrl) missingVars.push('VITE_SUPABASE_URL');
  if (!supabaseAnonKey) missingVars.push('VITE_SUPABASE_ANON_KEY');
  
  const errorMessage = `Configuration Supabase incomplète. Variables manquantes: ${missingVars.join(', ')}`;
  console.error(errorMessage);
  throw new Error(errorMessage);
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    redirectTo: window.location.hostname === 'localhost' 
      ? 'http://localhost:5173' 
      : 'https://superb-horse-1f4661.netlify.app',
    storageKey: 'dnd-tracker-auth',
    storage: window.localStorage,
    debug: true // Activer temporairement pour diagnostiquer
  },
  global: {
    headers: {
      'x-application-name': 'dnd-ultimate-tracker'
    }
  }
});

// Fonction pour vérifier la connexion à Supabase
export const testConnection = async () => {
  try {
    console.log('=== TESTING CONNECTION ===');
    console.log('Testing connection to:', supabaseUrl);
    
    if (!supabase.auth) {
      throw new Error('Client Supabase non initialisé');
    }

    // Test de ping simple
    console.log('Step 1: Testing basic connectivity...');
    const pingResponse = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'HEAD',
      headers: {
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`
      }
    });
    
    console.log('Ping response status:', pingResponse.status);
    console.log('Ping response headers:', Object.fromEntries(pingResponse.headers.entries()));
    
    if (!pingResponse.ok) {
      throw new Error(`Ping failed with status: ${pingResponse.status}`);
    }

    // Test de requête à la base de données
    console.log('Step 2: Testing database query...');
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 secondes timeout

    try {
      const { data, error } = await supabase
        .from('group_treasury')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal);

      clearTimeout(timeoutId);

      if (error) {
        console.error('=== DATABASE ERROR ===');
        console.error('Message:', error.message);
        console.error('Details:', error.details);
        console.error('Hint:', error.hint);
        console.error('Code:', error.code);
        return {
          success: false,
          error: `Erreur de connexion: ${error.message}`
        };
      }

      console.log('=== CONNECTION SUCCESS ===');
      console.log('Data received:', data);
      return { success: true };
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error instanceof DOMException && error.name === 'AbortError') {
        console.error('=== TIMEOUT ERROR ===');
        return {
          success: false,
          error: 'La connexion a pris trop de temps. Vérifiez votre connexion Internet.'
        };
      }
      throw error;
    }
  } catch (error: any) {
    console.error('=== UNEXPECTED ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return {
      success: false,
      error: error.message || 'Erreur inattendue lors de la connexion'
    };
  }
};
// Fonction pour diagnostiquer les problèmes OAuth
export const diagnoseOAuth = () => {
  console.log('=== DIAGNOSTIC OAUTH ===');
  console.log('Current URL:', window.location.href);
  console.log('Hostname:', window.location.hostname);
  console.log('Origin:', window.location.origin);
  console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
  console.log('Expected redirect:', window.location.hostname === 'localhost' 
    ? 'http://localhost:5173' 
    : 'https://superb-horse-1f4661.netlify.app');
};
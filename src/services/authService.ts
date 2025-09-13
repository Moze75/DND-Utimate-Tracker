import { supabase } from '../lib/supabase';

// Service pour gérer l'authentification
export const authService = {
  // Récupérer la session actuelle
  async getSession() {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  // S'inscrire avec email et mot de passe
  async signUp(email: string, password: string) {
    return await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: 'https://superb-horse-1f4661.netlify.app'
      }
    });
  },

  // Se connecter avec email et mot de passe
  async signInWithEmail(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Vérifier si l'email est confirmé
    if (!error && data.user && !data.user.email_confirmed_at) {
      // Déconnecter l'utilisateur s'il n'a pas confirmé son email
      await supabase.auth.signOut();
      return {
        data: null,
        error: {
          message: 'Veuillez confirmer votre adresse email avant de vous connecter. Vérifiez votre boîte de réception.',
          name: 'EmailNotConfirmed'
        }
      };
    }
    
    return { data, error };
  },

  // Se connecter avec Google
  async signInWithGoogle() {
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: 'https://superb-horse-1f4661.netlify.app',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        }
      }
    });
  },

  // Se déconnecter
  async signOut() {
    return await supabase.auth.signOut();
  },

  // Écouter les changements d'authentification
  onAuthStateChange(callback: (session: any) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
  }
};
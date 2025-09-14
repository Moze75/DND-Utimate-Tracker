import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from './lib/supabase';
import GamePage from './pages/GamePage';
import { Player } from './types/dnd';
import CharacterSelectionPage from './pages/CharacterSelectionPage';
import { playerService } from './services/playerService';

const LAST_SELECTED_CHARACTER_ID = 'ut:lastCharacterId';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

export default function App() {
  const [session, setSession] = useState<any | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);

  // Initialisation et écoute des changements d'authentification
  useEffect(() => {
    let unsub: (() => void) | null = null;

    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        setSession(data.session ?? null);

        const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
          setSession(s);
          if (!s) {
            setSelectedCharacter(null);
            // Optionnel: nettoyer le dernier ID si tu veux
            // localStorage.removeItem(LAST_SELECTED_CHARACTER_ID);
          }
        });

        unsub = () => {
          try {
            sub?.subscription?.unsubscribe();
          } catch {
            // ignore
          }
        };
      } catch (e) {
        console.error('[App] init auth error:', e);
      } finally {
        setInitializing(false);
      }
    })();

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Auto-resume: si session OK et pas de personnage sélectionné, tente de recharger le dernier
  useEffect(() => {
    if (!session) return; // Pas connecté
    if (selectedCharacter) return; // Déjà un personnage
    if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
      return;
    }

    const lastId = localStorage.getItem(LAST_SELECTED_CHARACTER_ID);
    if (!lastId) return;

    let aborted = false;

    (async () => {
      try {
        const player = await playerService.getPlayerById(lastId);
        if (aborted) return;
        if (player) {
          setSelectedCharacter(player);
        } else {
          localStorage.removeItem(LAST_SELECTED_CHARACTER_ID);
        }
      } catch (e) {
        console.warn('[AutoResume] Échec de récupération du personnage:', e);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [session, selectedCharacter]);

  const handleSelectCharacter = (player: Player) => {
    try {
      localStorage.setItem(LAST_SELECTED_CHARACTER_ID, player.id);
      sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
    } catch {
      // stockage non critique
    }
    setSelectedCharacter(player);
  };

  const handleBackToSelection = () => {
    sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    setSelectedCharacter(null);
  };

  if (initializing) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400">Initialisation...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <InlineLogin />;
  }

  if (selectedCharacter) {
    return (
      <GamePage
        session={session}
        selectedCharacter={selectedCharacter}
        onBackToSelection={handleBackToSelection}
      />
    );
  }

  return <CharacterSelectionPage onSelect={handleSelectCharacter} />;
}

/**
 * Panneau de connexion minimal (email OTP + OAuth GitHub).
 * Assure-toi d’avoir configuré:
 * - VITE_SUPABASE_URL
 * - VITE_SUPABASE_ANON_KEY
 * - (optionnel) OAuth GitHub dans Supabase et l’URL de redirection: window.location.origin
 */
function InlineLogin() {
  const [email, setEmail] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);

  const signInWithEmail = async () => {
    if (!email) {
      toast.error('Veuillez saisir un email.');
      return;
    }
    setLoadingEmail(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      toast.success('Lien de connexion envoyé. Vérifiez votre email.');
    } catch (e: any) {
      console.error('[Auth] email OTP error:', e);
      toast.error(e?.message ?? 'Échec de l’envoi du lien de connexion.');
    } finally {
      setLoadingEmail(false);
    }
  };

  const signInWithGithub = async () => {
    setLoadingGithub(true);
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Redirection gérée par Supabase
    } catch (e: any) {
      console.error('[Auth] github oauth error:', e);
      toast.error(e?.message ?? 'Connexion GitHub impossible.');
    } finally {
      setLoadingGithub(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6 stat-card p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Ultimate Tracker</h1>
          <p className="text-gray-400 mt-1">Connectez-vous pour continuer</p>
        </div>

        <div className="space-y-3">
          <label className="block text-sm text-gray-300">Connexion par email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            className="w-full px-3 py-2 rounded-lg bg-gray-800/60 border border-gray-700 focus:outline-none focus:ring-2 focus:ring-red-500"
          />
          <button
            onClick={signInWithEmail}
            disabled={loadingEmail}
            className="w-full btn-primary px-4 py-2 rounded-lg disabled:opacity-60"
          >
            {loadingEmail ? 'Envoi...' : 'Recevoir un lien de connexion'}
          </button>
        </div>

        <div className="relative py-2">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-transparent text-gray-400">ou</span>
          </div>
        </div>

        <button
          onClick={signInWithGithub}
          disabled={loadingGithub}
          className="w-full btn-secondary px-4 py-2 rounded-lg disabled:opacity-60"
        >
          {loadingGithub ? 'Redirection...' : 'Se connecter avec GitHub'}
        </button>

        <p className="text-xs text-gray-500 text-center">
          Conseil: en dev, configure la redirection OAuth à {window.location.origin} dans Supabase.
        </p>
      </div>
    </div>
  );
}
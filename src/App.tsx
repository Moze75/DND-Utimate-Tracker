import React, { useEffect, useState, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { Player } from './types/dnd';
import { InstallPrompt } from './components/InstallPrompt';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter'; // même clé qu'avant
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);

  const [LoginPage, setLoginPage] = useState<React.ComponentType<any> | null>(null);
  const [CharacterSelectionPage, setCharacterSelectionPage] = useState<React.ComponentType<any> | null>(null);
  const [GamePage, setGamePage] = useState<React.ComponentType<any> | null>(null);

  // État pour la confirmation de retour depuis la page Jeu
  const [showBackConfirm, setShowBackConfirm] = useState(false);

  // Refs pour le handler "back"
  const backPressRef = useRef<number>(0);
  const sessionRef = useRef<any>(null);
  const selectedCharacterRef = useRef<Player | null>(null);
  const showBackConfirmRef = useRef<boolean>(false);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    selectedCharacterRef.current = selectedCharacter;
  }, [selectedCharacter]);

  useEffect(() => {
    showBackConfirmRef.current = showBackConfirm;
  }, [showBackConfirm]);

  // Charger dynamiquement les pages (exports nommés)
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const loginModule = await import('./pages/LoginPage');
        const characterSelectionModule = await import('./pages/CharacterSelectionPage');
        const gamePageModule = await import('./pages/GamePage');

        setLoginPage(() => (loginModule as any).LoginPage ?? (loginModule as any).default);
        setCharacterSelectionPage(
          () => (characterSelectionModule as any).CharacterSelectionPage ?? (characterSelectionModule as any).default
        );
        setGamePage(() => (gamePageModule as any).GamePage ?? (gamePageModule as any).default);
      } catch (error) {
        console.error('Erreur lors du chargement des composants:', error);
      }
    };

    loadComponents();
  }, []);

  // Initialisation session + restauration du personnage si session présente
  useEffect(() => {
    const initSession = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const current = data?.session ?? null;
        setSession(current);

        if (current) {
          // Respecter le choix utilisateur: ne pas auto-reprendre juste après retour volontaire
          if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
            sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
          } else {
            const savedChar = localStorage.getItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
            if (savedChar) {
              try {
                setSelectedCharacter(JSON.parse(savedChar));
              } catch (e) {
                console.error('Erreur parsing selectedCharacter:', e);
              }
            }
          }
        } else {
          // Pas de session -> purge mémoire (le snapshot sera supprimé lors de onAuthStateChange logout)
          setSelectedCharacter(null);
        }
      } finally {
        setLoading(false);
      }
    };

    initSession();
  }, []);

  // Écoute des changements d’état d’authentification
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);

      if (!newSession) {
        // Déconnexion -> purger la sélection et le stockage local
        setSelectedCharacter(null);
        localStorage.removeItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
      } else {
        // À la connexion (ou refresh), si aucun personnage sélectionné, tenter une restauration
        if (!selectedCharacter) {
          if (sessionStorage.getItem(SKIP_AUTO_RESUME_ONCE) === '1') {
            sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
          } else {
            const savedChar = localStorage.getItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
            if (savedChar) {
              try {
                setSelectedCharacter(JSON.parse(savedChar));
              } catch (e) {
                console.error('Erreur parsing selectedCharacter (auth change):', e);
              }
            }
          }
        }
      }

      // Feedback visuel léger lors d’un refresh de token
      if (event === 'TOKEN_REFRESHED') {
        setRefreshingSession(true);
        setTimeout(() => setRefreshingSession(false), 1200);
      }
    });

    return () => {
      try {
        sub.subscription.unsubscribe();
      } catch {
        // no-op
      }
    };
  }, [selectedCharacter]);

  // Sauvegarder le personnage sélectionné dans localStorage (snapshot complet)
  // IMPORTANT: on ne supprime PAS le snapshot quand selectedCharacter redevient null
  // (pour permettre la reprise auto après un simple retour à la sélection).
  useEffect(() => {
    if (selectedCharacter) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(selectedCharacter));
      } catch {
        // no-op
      }
    }
  }, [selectedCharacter]);

  // Gestion du bouton "retour" Android / navigateur:
  // - Si on est en jeu, afficher un popup de confirmation pour revenir à la sélection.
  // - Si le popup est déjà ouvert, un retour le ferme.
  // - À la racine (login/sélection), activer "double appui pour quitter".
  useEffect(() => {
    try {
      window.history.pushState({ ut: 'keepalive' }, '');
    } catch {
      // no-op
    }

    const onPopState = (_ev: PopStateEvent) => {
      // Si le popup est ouvert -> fermer le popup
      if (showBackConfirmRef.current) {
        setShowBackConfirm(false);
        try {
          window.history.pushState({ ut: 'keepalive' }, '');
        } catch {
          // no-op
        }
        return;
      }

      // Si on est en jeu -> demander confirmation
      if (sessionRef.current && selectedCharacterRef.current) {
        setShowBackConfirm(true);
        // Ré-armer l'entrée d'historique pour capturer le prochain "retour"
        try {
          window.history.pushState({ ut: 'keepalive' }, '');
        } catch {
          // no-op
        }
        return;
      }

      // À la racine (login/sélection) -> double appui pour quitter
      const now = Date.now();
      if (now - (backPressRef.current ?? 0) < 1500) {
        window.removeEventListener('popstate', onPopState);
        window.history.back();
      } else {
        backPressRef.current = now;
        toast('Appuyez à nouveau pour quitter', { icon: '↩️' });
        try {
          window.history.pushState({ ut: 'keepalive' }, '');
        } catch {
          // no-op
        }
      }
    };

    window.addEventListener('popstate', onPopState);
    return () => {
      window.removeEventListener('popstate', onPopState);
    };
  }, []);

  const confirmReturnToSelection = () => {
    try {
      sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    } catch {
      // no-op
    }
    setShowBackConfirm(false);
    setSelectedCharacter(null);
    // Ré-armer l'historique pour la suite
    try {
      window.history.pushState({ ut: 'keepalive' }, '');
    } catch {
      // no-op
    }
  };

  const cancelReturnToSelection = () => {
    setShowBackConfirm(false);
    try {
      window.history.pushState({ ut: 'keepalive' }, '');
    } catch {
      // no-op
    }
  };

  // Écran de chargement des composants dynamiques
  if (!LoginPage || !CharacterSelectionPage || !GamePage) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
          <p className="text-gray-400">Chargement des composants...</p>
        </div>
      </div>
    );
  }

  // Écran de chargement initial (session)
  if (loading) {
    return (
      <>
        <Toaster position="top-right" />
        <InstallPrompt />
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
            <p className="text-gray-400">Chargement en cours...</p>
          </div>
        </div>
      </>
    );
  }

  // Rendu avec ordre correct:
  // 1) Pas de session -> Login
  // 2) Session sans personnage -> Sélection
  // 3) Session + personnage -> Jeu
  return (
    <>
      <Toaster position="top-right" />
      <InstallPrompt />

      {refreshingSession && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50">
          Tentative de reconnexion...
        </div>
      )}

      {!session ? (
        <LoginPage />
      ) : !selectedCharacter ? (
        <CharacterSelectionPage
          session={session}
          onCharacterSelect={(p: Player) => {
            try {
              sessionStorage.removeItem(SKIP_AUTO_RESUME_ONCE);
            } catch {
              // no-op
            }
            setSelectedCharacter(p);
          }}
        />
      ) : (
        <GamePage
          session={session}
          selectedCharacter={selectedCharacter}
          onBackToSelection={() => {
            try {
              sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
            } catch {
              // no-op
            }
            setSelectedCharacter(null);
          }}
          onUpdateCharacter={(p: Player) => {
            setSelectedCharacter(p);
            // App écrit aussi le snapshot pour sécuriser
            try {
              localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(p));
            } catch {
              // no-op
            }
          }}
        />
      )}

      {/* Popup de confirmation retour vers la page personnages */}
      {showBackConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={cancelReturnToSelection} />
          <div
            role="dialog"
            aria-modal="true"
            className="relative z-10 w-11/12 max-w-sm rounded-lg bg-zinc-800 p-5 text-white shadow-lg"
          >
            <h2 className="text-lg font-semibold mb-2">Revenir aux personnages ?</h2>
            <p className="text-sm text-zinc-300 mb-4">
              Souhaitez-vous revenir à la page des personnages ? Votre progression est sauvegardée automatiquement.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={cancelReturnToSelection}
                className="px-3 py-2 rounded bg-zinc-700 hover:bg-zinc-600"
              >
                Rester
              </button>
              <button
                onClick={confirmReturnToSelection}
                className="px-3 py-2 rounded bg-red-600 hover:bg-red-500"
              >
                Revenir
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
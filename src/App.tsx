import React, { useEffect, useState } from 'react';
import { Toaster } from 'react-hot-toast';
import { supabase } from './lib/supabase';
import type { Player } from './types/dnd';
import { InstallPrompt } from './components/InstallPrompt';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);

  const [LoginPage, setLoginPage] = useState<React.ComponentType<any> | null>(null);
  const [CharacterSelectionPage, setCharacterSelectionPage] = useState<React.ComponentType<any> | null>(null);
  const [GamePage, setGamePage] = useState<React.ComponentType<any> | null>(null);

  // Charger dynamiquement les pages avec fallback sur export default pour éviter le chargement infini
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const loginModule = await import('./pages/LoginPage');
        const characterSelectionModule = await import('./pages/CharacterSelectionPage');
        const gamePageModule = await import('./pages/GamePage');

        const LoginComp =
          (loginModule as any).LoginPage ??
          (loginModule as any).default;

        const CharacterSelectionComp =
          (characterSelectionModule as any).CharacterSelectionPage ??
          (characterSelectionModule as any).default;

        const GameComp =
          (gamePageModule as any).GamePage ??
          (gamePageModule as any).default;

        setLoginPage(() => LoginComp);
        setCharacterSelectionPage(() => CharacterSelectionComp);
        setGamePage(() => GameComp);
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
          // Respecte le choix utilisateur de rester sur l'écran de sélection (flag one-shot)
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
          // Pas de session -> on s’assure de ne pas garder un personnage sélectionné
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
          // Respecter le flag one-shot si présent
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
  useEffect(() => {
    if (selectedCharacter) {
      localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(selectedCharacter));
    } else {
      localStorage.removeItem(LAST_SELECTED_CHARACTER_SNAPSHOT);
    }
  }, [selectedCharacter]);

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
            // Dès qu'on choisit un perso, on efface le flag d'anti-auto-resume
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
            // Empêche l'auto-resume une fois, quand l'utilisateur revient volontairement à la sélection
            try {
              sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
            } catch {
              // no-op
            }
            setSelectedCharacter(null);
          }}
          onUpdateCharacter={(p: Player) => {
            setSelectedCharacter(p);
          }}
        />
      )}
    </>
  );
}

export default App;
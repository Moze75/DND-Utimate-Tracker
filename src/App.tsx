import React, { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';
import GamePage from './pages/GamePage';
import { Player } from './types/dnd';

// Adapte ce chemin au composant de sélection de personnage de ton app
// Il doit exposer une prop onSelect(player: Player)
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
            // Si l'utilisateur se déconnecte, on revient à la sélection
            setSelectedCharacter(null);
            // Optionnel: on peut aussi nettoyer le dernier ID mémorisé
            // localStorage.removeItem(LAST_SELECTED_CHARACTER_ID);
          }
        });

        unsub = () => {
          try {
            sub.subscription.unsubscribe();
          } catch {
            // ignore
          }
        };
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
      // Respecter la demande de rester sur l'écran de sélection (une seule fois)
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
          // ID obsolète: nettoyer
          localStorage.removeItem(LAST_SELECTED_CHARACTER_ID);
        }
      } catch (e) {
        // En cas d'erreur, on reste sur l'écran de sélection
        // et on ne casse pas l'appli
        // console.warn('[AutoResume] Échec de récupération du personnage:', e);
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
    // Evite un auto-resume immédiat quand l'utilisateur choisit explicitement de revenir
    sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    setSelectedCharacter(null);
  };

  // État de chargement global (auth en cours)
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

  // Si pas de session, tu peux ici afficher une page/login
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 stat-card p-6 text-center">
          <h1 className="text-2xl font-bold">Ultimate Tracker</h1>
          <p className="text-gray-300">
            Veuillez vous connecter pour continuer.
          </p>
          {/* 
            Ajoute ici ton composant d'authentification Supabase / bouton de connexion 
            ou redirige vers une route /login si tu utilises un router.
          */}
        </div>
      </div>
    );
  }

  // Game vs Sélection
  if (selectedCharacter) {
    return (
      <GamePage
        session={session}
        selectedCharacter={selectedCharacter}
        onBackToSelection={handleBackToSelection}
      />
    );
  }

  return (
    <CharacterSelectionPage onSelect={handleSelectCharacter} />
  );
}
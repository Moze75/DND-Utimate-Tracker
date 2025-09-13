import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import toast, { Toaster } from 'react-hot-toast';
import { Player } from './types/dnd';
import { InstallPrompt } from './components/InstallPrompt';

function App() {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);
  const [selectedCharacter, setSelectedCharacter] = useState<Player | null>(null);
  const [refreshingSession, setRefreshingSession] = useState(false);

  const [LoginPage, setLoginPage] = useState<React.ComponentType<any> | null>(null);
  const [CharacterSelectionPage, setCharacterSelectionPage] = useState<React.ComponentType<any> | null>(null);
  const [GamePage, setGamePage] = useState<React.ComponentType<any> | null>(null);

  // 🔑 Sauvegarder le personnage sélectionné dans localStorage
  useEffect(() => {
    if (selectedCharacter) {
      localStorage.setItem('selectedCharacter', JSON.stringify(selectedCharacter));
    } else {
      localStorage.removeItem('selectedCharacter');
    }
  }, [selectedCharacter]);

  // 🔄 Import dynamique des pages
  useEffect(() => {
    const loadComponents = async () => {
      try {
        const loginModule = await import('./pages/LoginPage');
        const characterSelectionModule = await import('./pages/CharacterSelectionPage');
        const gamePageModule = await import('./pages/GamePage');

        setLoginPage(() => loginModule.LoginPage);
        setCharacterSelectionPage(() => characterSelectionModule.CharacterSelectionPage);
        setGamePage(() => gamePageModule.GamePage);
      } catch (error) {
        console.error('Erreur lors du chargement des composants:', error);
      }
    };

    loadComponents();
  }, []);

  // 🔄 Initialisation session + restauration personnage
  useEffect(() => {
    const initSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data?.session) setSession(data.session);

      const savedChar = localStorage.getItem('selectedCharacter');
      if (savedChar) {
        try {
          setSelectedCharacter(JSON.parse(savedChar));
        } catch (e) {
          console.error('Erreur parsing selectedCharacter:', e);
        }
      }

      setLoading(false);
    };

    initSession();

    // 🔄 Écoute des changements d’auth
    const { data: subscription } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      if (!newSession) {
        // Tentative de refresh silencieux
        setRefreshingSession(true);
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          setSession(data.session);
        } else {
          // On ne reset pas l'UI, juste prévenir l'utilisateur
          toast.error('Session expirée, reconnexion en cours...');
          setSession(null); // facultatif, selon si tu veux bloquer certaines actions
        }
        setRefreshingSession(false);
      } else {
        setSession(newSession);
      }
    });

    // 🔄 Listener pour restaurer session quand l'onglet redevient actif
    const handleVisibility = async () => {
      if (document.visibilityState === "visible") {
        const { data } = await supabase.auth.getSession();
        if (data?.session) setSession(data.session);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      subscription?.subscription?.unsubscribe();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto" />
          <p className="text-gray-400">Restauration de la session...</p>
        </div>
      </div>
    );
  }

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

  return (
    <>
      <Toaster position="top-right" />
      <InstallPrompt />

      {/* 🔔 Bandeau session expirée */}
      {refreshingSession && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-black text-center py-2 z-50">
          Tentative de reconnexion...
        </div>
      )}

      {!session ? (
        !selectedCharacter ? (
          <CharacterSelectionPage
            session={session}
            onCharacterSelect={setSelectedCharacter}
          />
        ) : (
          <GamePage
            session={session}
            selectedCharacter={selectedCharacter}
            onBackToSelection={() => setSelectedCharacter(null)}
          />
        )
      ) : !selectedCharacter ? (
        <CharacterSelectionPage
          session={session}
          onCharacterSelect={setSelectedCharacter}
        />
      ) : (
        <GamePage
          session={session}
          selectedCharacter={selectedCharacter}
          onBackToSelection={() => setSelectedCharacter(null)}
        />
      )}
    </>
  );
}

export default App;

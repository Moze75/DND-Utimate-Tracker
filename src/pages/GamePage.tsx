import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';

import { testConnection } from '../lib/supabase';
import { Player } from '../types/dnd';

import { PlayerProfile } from '../components/PlayerProfile';
import { TabNavigation } from '../components/TabNavigation';
import CombatTab from '../components/CombatTab';
import { EquipmentTab } from '../components/EquipmentTab';
import { AbilitiesTab } from '../components/AbilitiesTab';
import { StatsTab } from '../components/StatsTab';
import { ClassesTab } from '../components/ClassesTab';
import { PlayerContext } from '../contexts/PlayerContext';

import { inventoryService } from '../services/inventoryService';

type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const lastTabKeyFor = (playerId: string) => `ut:lastActiveTab:${playerId}`;
const isValidTab = (t: string | null): t is TabKey =>
  t === 'combat' || t === 'abilities' || t === 'stats' || t === 'equipment' || t === 'class';

type GamePageProps = {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
  onUpdateCharacter?: (p: Player) => void;
};

export function GamePage({
  session,
  selectedCharacter,
  onBackToSelection,
  onUpdateCharacter,
}: GamePageProps) {
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // Source de vérité locale pour le joueur courant (évite les "sauts" d'UI)
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(selectedCharacter);

  const [inventory, setInventory] = useState<any[]>([]);

  // Restaure l'onglet actif dès l'init, de façon synchrone (aucun flash vers 'combat')
  const initialTab: TabKey = (() => {
    try {
      const saved = localStorage.getItem(lastTabKeyFor(selectedCharacter.id));
      return isValidTab(saved) ? saved : 'combat';
    } catch {
      return 'combat';
    }
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Pour ne pas remettre le spinner en boucle: on ne ré-initialise que si l'ID change
  const prevPlayerId = useRef<string | null>(selectedCharacter?.id ?? null);

  // Centralise toutes les mises à jour du joueur
  const applyPlayerUpdate = useCallback(
    (updated: Player) => {
      // 1) UI instantanée
      setCurrentPlayer(updated);

      // 2) Propage vers App (qui garde selectedCharacter synchronisé)
      try {
        onUpdateCharacter?.(updated);
      } catch {
        // no-op
      }

      // 3) Persiste immédiatement un snapshot pour le prochain reload
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(updated));
      } catch {
        // non critique
      }
    },
    [onUpdateCharacter]
  );

  // Mémorise un snapshot dès l'entrée sur la page, et à chaque changement du joueur courant
  useEffect(() => {
    if (currentPlayer) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
      } catch {
        // non critique
      }
    }
  }, [currentPlayer]);

  // Sauvegarde aussi juste avant fermeture/changement d'onglet
  useEffect(() => {
    const persist = () => {
      if (!currentPlayer) return;
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
      } catch {
        // non critique
      }
      try {
        localStorage.setItem(lastTabKeyFor(selectedCharacter.id), activeTab);
      } catch {
        // non critique
      }
    };

    window.addEventListener('visibilitychange', persist);
    window.addEventListener('pagehide', persist);

    return () => {
      window.removeEventListener('visibilitychange', persist);
      window.removeEventListener('pagehide', persist);
    };
  }, [currentPlayer, activeTab, selectedCharacter.id]);

  // Persiste l'onglet à chaque changement
  useEffect(() => {
    try {
      localStorage.setItem(lastTabKeyFor(selectedCharacter.id), activeTab);
    } catch {
      // non critique
    }
  }, [activeTab, selectedCharacter.id]);

  // Si on change de personnage, restaurer l'onglet propre à ce personnage
  useEffect(() => {
    const saved = (() => {
      try {
        const v = localStorage.getItem(lastTabKeyFor(selectedCharacter.id));
        return isValidTab(v) ? v : 'combat';
      } catch {
        return 'combat';
      }
    })();
    setActiveTab(saved);
  }, [selectedCharacter.id]);

  // Initialisation: ne se relance que quand l'ID change (pas à chaque modification de champ)
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setConnectionError(null);

        const isConnected = await testConnection();
        if (!isConnected.success) {
          throw new Error('Impossible de se connecter à la base de données');
        }

        // Si on reste sur le même perso, ne pas écraser l'état local
        setCurrentPlayer((prev) =>
          prev && prev.id === selectedCharacter.id ? prev : selectedCharacter
        );

        const inventoryData = await inventoryService.getPlayerInventory(selectedCharacter.id);
        setInventory(inventoryData);

        setLoading(false);
      } catch (error: any) {
        console.error("Erreur d'initialisation:", error);
        setConnectionError(error?.message ?? 'Erreur inconnue');
        setLoading(false);
      }
    };

    // Ne relancer init que si l'ID a changé
    if (prevPlayerId.current !== selectedCharacter.id) {
      prevPlayerId.current = selectedCharacter.id;
      initialize();
    } else {
      // Première montée: si on n'a pas encore chargé, on initialise
      if (loading) {
        initialize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacter.id]); // dépend seulement de l'ID

  // Empêche le "saut" de page lors du changement d’onglet (ex: Sorts/Classe)
  const handleTabChange = useCallback((tab: string) => {
    const y = window.scrollY;
    const body = document.body;

    // Lock du scroll (technique modale)
    const prevPosition = body.style.position;
    const prevTop = body.style.top;
    const prevWidth = body.style.width;

    body.style.position = 'fixed';
    body.style.top = `-${y}px`;
    body.style.width = '100%';

    setActiveTab(tab as TabKey);

    // Laisse le nouveau contenu se monter puis restaure la position
    const UNLOCK_DELAY_MS = 450; // ajuste si besoin (350–600ms)
    window.setTimeout(() => {
      body.style.position = prevPosition;
      body.style.top = prevTop;
      body.style.width = prevWidth;
      window.scrollTo(0, y);
    }, UNLOCK_DELAY_MS);
  }, []);

  const handleBackToSelection = () => {
    try {
      // Empêche l'auto-resume immédiatement après un retour volontaire à la sélection
      sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    } catch {
      // ignore
    }
    onBackToSelection?.();
    toast.success('Retour à la sélection des personnages');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="text-gray-400">Chargement en cours...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-4 stat-card p-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-500 mb-4">Erreur de connexion</h2>
            <p className="text-gray-300 mb-4">{connectionError}</p>
            <p className="text-sm text-gray-400 mb-4">
              Vérifiez votre connexion Internet et réessayez.
            </p>
          </div>
          <button
            onClick={() => {
              setConnectionError(null);
              // relance init
              setLoading(true);
              (async () => {
                try {
                  const isConnected = await testConnection();
                  if (!isConnected.success) throw new Error('Impossible de se connecter');
                  const inventoryData = await inventoryService.getPlayerInventory(selectedCharacter.id);
                  setInventory(inventoryData);
                  setCurrentPlayer(selectedCharacter);
                  setLoading(false);
                } catch (e: any) {
                  console.error(e);
                  setConnectionError(e?.message ?? 'Erreur inconnue');
                  setLoading(false);
                }
              })();
            }}
            className="w-full btn-primary px-4 py-2 rounded-lg"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile player={currentPlayer} onUpdate={applyPlayerUpdate} />

            <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

            {activeTab === 'combat' && (
              <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
            )}

            {activeTab === 'abilities' && (
              <AbilitiesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
            )}

            {activeTab === 'stats' && (
              <StatsTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
            )}

            {activeTab === 'equipment' && (
              <EquipmentTab
                player={currentPlayer}
                inventory={inventory}
                onPlayerUpdate={applyPlayerUpdate}
                onInventoryUpdate={setInventory}
              />
            )}

            {activeTab === 'class' && (
              <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
            )}
          </PlayerContext.Provider>
        )}
      </div>

      <div className="w-full max-w-md mx-auto mt-6 px-4">
        <button
          onClick={handleBackToSelection}
          className="w-full btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2"
        >
          <LogOut size={20} />
          Retour aux personnages
        </button>
      </div>
    </div>
  );
}
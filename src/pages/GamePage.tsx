import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
import { SwipeNavigator } from '../components/SwipeNavigator';

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
import PlayerProfileProfileTab from '../components/PlayerProfileProfileTab'; // + Profil

type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class' | 'profile'; // + 'profile'

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const lastTabKeyFor = (playerId: string) => `ut:lastActiveTab:${playerId}`;
const isValidTab = (t: string | null): t is TabKey =>
  t === 'combat' || t === 'abilities' || t === 'stats' || t === 'equipment' || t === 'class' || t === 'profile'; // + profile

type GamePageProps = {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
  onUpdateCharacter?: (p: Player) => void;
};

// Gèle le scroll (préserve la position) pendant un changement d’onglet
function freezeScroll(): number {
  const y = window.scrollY || window.pageYOffset || 0;
  const body = document.body;
  // Sauvegarde pour restauration
  (body as any).__scrollY = y;
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  return y;
}
function unfreezeScroll() {
  const body = document.body;
  const y = (body as any).__scrollY || 0;
  // Reset styles
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  // Restaure la position exacte
  window.scrollTo(0, y);
  delete (body as any).__scrollY;
}

// Maintient la position pendant quelques frames pour contrer les reflows tardifs
function stabilizeScroll(y: number, durationMs = 350) {
  const start = performance.now();
  const tick = (now: number) => {
    window.scrollTo(0, y);
    if (now - start < durationMs) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

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

// Doit refléter l'ordre des 6 onglets (cohérent avec TabNavigation.tsx)
const tabIds: TabKey[] = ['combat', 'class', 'abilities', 'stats', 'equipment', 'profile'];

const tabIndex = tabIds.indexOf(activeTab);
const setTabIndex = (i: number) => {
  const next = (i + tabIds.length) % tabIds.length; // wrap
  handleTabChange(tabIds[next]);
};
  
  // Pour ne pas remettre le spinner en boucle: on ne ré-initialise que si l'ID change
  const prevPlayerId = useRef<string | null>(selectedCharacter?.id ?? null);

  // Centralise toutes les mises à jour du joueur
  const applyPlayerUpdate = useCallback(
    (updated: Player) => {
      setCurrentPlayer(updated);
      try {
        onUpdateCharacter?.(updated);
      } catch {
        // no-op
      }
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(updated));
      } catch {
        // non critique
      }
    },
    [onUpdateCharacter]
  );

  useEffect(() => {
    if (currentPlayer) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
      } catch {
        // non critique
      }
    }
  }, [currentPlayer]);

  useEffect(() => {
    const persist = () => {
      if (!currentPlayer) return;
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
      } catch {}
      try {
        localStorage.setItem(lastTabKeyFor(selectedCharacter.id), activeTab);
      } catch {}
    };

    window.addEventListener('visibilitychange', persist);
    window.addEventListener('pagehide', persist);
    return () => {
      window.removeEventListener('visibilitychange', persist);
      window.removeEventListener('pagehide', persist);
    };
  }, [currentPlayer, activeTab, selectedCharacter.id]);

  useEffect(() => {
    try {
      localStorage.setItem(lastTabKeyFor(selectedCharacter.id), activeTab);
    } catch {}
  }, [activeTab, selectedCharacter.id]);

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

  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setConnectionError(null);

        const isConnected = await testConnection();
        if (!isConnected.success) {
          throw new Error('Impossible de se connecter à la base de données');
        }

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

    if (prevPlayerId.current !== selectedCharacter.id) {
      prevPlayerId.current = selectedCharacter.id;
      initialize();
    } else {
      if (loading) {
        initialize();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacter.id]);

  // Empêche le "saut" de page lors du changement d’onglet (ex: Sorts, Classe)
  const handleTabChange = useCallback((tab: string) => {
    // Gèle scroll (aucun mouvement pendant les reflows)
    const y = freezeScroll();

    // Désactive temporairement le smooth scroll global pour éviter l’animation
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    setActiveTab(tab as TabKey);

    // Laisse React peindre, puis restaure le scroll et stabilise pendant quelques frames
    requestAnimationFrame(() => {
      unfreezeScroll();         // rétablit la position exacte
      stabilizeScroll(y, 400);  // maintient la position ~0.4s contre les reflows tardifs
      // Restaure le scroll-behavior précédent après stabilisation
      setTimeout(() => {
        root.style.scrollBehavior = prevBehavior;
      }, 420);
    });
  }, []);

  const handleBackToSelection = () => {
    try {
      sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    } catch {}
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
    // Ajoute la classe utilitaire pour neutraliser l'overflow anchoring
    <div className="min-h-screen p-2 sm:p-4 md:p-6 no-overflow-anchor">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile player={currentPlayer} onUpdate={applyPlayerUpdate} />

            <TabNavigation activeTab={activeTab} onTabChange={handleTabChange} />

                  {/* Contenu swipable */}
        <SwipeNavigator index={tabIndex} setIndex={setTabIndex} count={tabIds.length}>
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
        
          {activeTab === 'profile' && (
            <PlayerProfileProfileTab player={currentPlayer} />
          )}
        </SwipeNavigator>
            
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

            {activeTab === 'profile' && (
              <PlayerProfileProfileTab player={currentPlayer} />
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
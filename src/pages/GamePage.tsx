import React, { useEffect, useState, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { LogOut } from 'lucide-react';
// import { SwipeNavigator } from '../components/SwipeNavigator'; // non utilisé avec le swipe progressif

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
import PlayerProfileProfileTab from '../components/PlayerProfileProfileTab';

import '../styles/swipe.css';

type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class' | 'profile';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const lastTabKeyFor = (playerId: string) => `ut:lastActiveTab:${playerId}`;
const isValidTab = (t: string | null): t is TabKey =>
  t === 'combat' || t === 'abilities' || t === 'stats' || t === 'equipment' || t === 'class' || t === 'profile';

// IMPORTANT: ordre visuel de gauche à droite
// PV/actions -> Classe -> Sorts -> Stats -> Sac -> Profil
const TAB_ORDER: TabKey[] = ['combat', 'class', 'abilities', 'stats', 'equipment', 'profile'];

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
  (body as any).__scrollY = y;
  // Astuce: on évite 100vh ici (problème barre d'adresse mobile)
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';      // pas de 100vw (peut inclure la scrollbar et déborder)
  body.style.overflowY = 'scroll';// conserve la largeur, évite "jump" lié à la scrollbar
  return y;
}
function unfreezeScroll() {
  const body = document.body;
  const y = (body as any).__scrollY || 0;
  body.style.position = '';
  body.style.top = '';
  body.style.left = '';
  body.style.right = '';
  body.style.width = '';
  body.style.overflowY = '';
  window.scrollTo(0, y);
  delete (body as any).__scrollY;
}
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

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(selectedCharacter);
  const [inventory, setInventory] = useState<any[]>([]);

  const initialTab: TabKey = (() => {
    try {
      const saved = localStorage.getItem(lastTabKeyFor(selectedCharacter.id));
      return isValidTab(saved) ? saved : 'combat';
    } catch {
      return 'combat';
    }
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Swipe interactif (progressif)
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef<number>(0);
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipingRef = useRef<boolean>(false);
  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const dragStartScrollYRef = useRef<number>(0);

  const prevPlayerId = useRef<string | null>(selectedCharacter?.id ?? null);

  const applyPlayerUpdate = useCallback(
    (updated: Player) => {
      setCurrentPlayer(updated);
      try {
        onUpdateCharacter?.(updated);
      } catch {}
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(updated));
      } catch {}
    },
    [onUpdateCharacter]
  );

  useEffect(() => {
    if (currentPlayer) {
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
      } catch {}
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
      if (loading) initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacter.id]);

  // voisins
  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const prevKey = activeIndex > 0 ? TAB_ORDER[activeIndex - 1] : null;
  const nextKey = activeIndex < TAB_ORDER.length - 1 ? TAB_ORDER[activeIndex + 1] : null;

  // mesure largeur
  useEffect(() => {
    const measure = () => {
      if (!viewportRef.current) return;
      widthRef.current = viewportRef.current.clientWidth;
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Handlers pointer (fonctionne souris + tactile); sur iOS, TouchEvents marchent aussi
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    swipingRef.current = false;
    setAnimating(false);
    viewportRef.current?.setPointerCapture?.(e.pointerId);
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (startXRef.current == null || startYRef.current == null) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // déclenche si l’horizontal prend le dessus
    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 4) {
      swipingRef.current = true;
      dragStartScrollYRef.current = freezeScroll();
      widthRef.current = viewportRef.current?.clientWidth ?? widthRef.current;
    }

    if (!swipingRef.current) return;

    e.preventDefault();

    const width = widthRef.current || viewportRef.current?.clientWidth || 0;

    // borne le drag à [-width, width]
    let clampedDx = Math.max(Math.min(dx, width), -width);

    // bloque si pas de page de ce côté
    if (!prevKey && clampedDx > 0) clampedDx = 0;
    if (!nextKey && clampedDx < 0) clampedDx = 0;

    setDragX(clampedDx);
  };

  const completeTransition = (direction: -1 | 1) => {
    const width = widthRef.current || (viewportRef.current?.clientWidth ?? 0);
    setAnimating(true);
    setDragX(direction * width);
    window.setTimeout(() => {
      const idx = TAB_ORDER.indexOf(activeTab);
      const targetIndex = idx + (direction === 1 ? 1 : -1);
      const targetKey = TAB_ORDER[targetIndex] ?? activeTab;
      setActiveTab(targetKey);
      setAnimating(false);
      setDragX(0);
      unfreezeScroll();
      stabilizeScroll(dragStartScrollYRef.current, 400);
    }, 310);
  };

  const cancelTransition = () => {
    setAnimating(true);
    setDragX(0);
    window.setTimeout(() => {
      setAnimating(false);
      unfreezeScroll();
      stabilizeScroll(dragStartScrollYRef.current, 300);
    }, 300);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    if (startXRef.current == null || startYRef.current == null) return;

    if (swipingRef.current) {
      const width = widthRef.current || (viewportRef.current?.clientWidth ?? 0);
      const threshold = Math.max(48, width * 0.25);
      if (dragX <= -threshold && nextKey) {
        completeTransition(1);   // vers la page de droite (prochaine)
      } else if (dragX >= threshold && prevKey) {
        completeTransition(-1);  // vers la page de gauche (précédente)
      } else {
        cancelTransition();
      }
    }

    startXRef.current = null;
    startYRef.current = null;
    swipingRef.current = false;
  };

  const handleTabClickChange = useCallback((tab: string) => {
    const y = freezeScroll();
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    setActiveTab(tab as TabKey);

    requestAnimationFrame(() => {
      unfreezeScroll();
      stabilizeScroll(y, 400);
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
    <div className="min-h-screen p-2 sm:p-4 md:p-6 no-overflow-anchor">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile player={currentPlayer} onUpdate={applyPlayerUpdate} />

            <TabNavigation activeTab={activeTab} onTabChange={handleTabClickChange} />

            {/* 3) Swipe progressif verrouillé à la largeur du viewport */}
            <div
              ref={viewportRef}
              className="swipe-viewport"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{ touchAction: 'pan-y' }}
            >
              <div
                className={`swipe-track ${animating ? 'animating' : ''}`}
                style={{
                  // translate3d évite des sous-pixels qui peuvent créer un 1px de débordement
                  transform: `translate3d(calc(-100% + ${dragX}px), 0, 0)`,
                }}
              >
                <div className="swipe-pane adjacent">
                  {prevKey && (
                    <>
                      {prevKey === 'combat' && (
                        <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {prevKey === 'class' && (
                        <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {prevKey === 'abilities' && (
                        <AbilitiesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {prevKey === 'stats' && (
                        <StatsTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {prevKey === 'equipment' && (
                        <EquipmentTab
                          player={currentPlayer}
                          inventory={inventory}
                          onPlayerUpdate={applyPlayerUpdate}
                          onInventoryUpdate={setInventory}
                        />
                      )}
                      {prevKey === 'profile' && (
                        <PlayerProfileProfileTab player={currentPlayer} />
                      )}
                    </>
                  )}
                </div>

                <div className="swipe-pane">
                  {activeTab === 'combat' && (
                    <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                  )}
                  {activeTab === 'class' && (
                    <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
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
                  {activeTab === 'profile' && (
                    <PlayerProfileProfileTab player={currentPlayer} />
                  )}
                </div>

                <div className="swipe-pane adjacent">
                  {nextKey && (
                    <>
                      {nextKey === 'combat' && (
                        <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {nextKey === 'class' && (
                        <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {nextKey === 'abilities' && (
                        <AbilitiesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {nextKey === 'stats' && (
                        <StatsTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
                      )}
                      {nextKey === 'equipment' && (
                        <EquipmentTab
                          player={currentPlayer}
                          inventory={inventory}
                          onPlayerUpdate={applyPlayerUpdate}
                          onInventoryUpdate={setInventory}
                        />
                      )}
                      {nextKey === 'profile' && (
                        <PlayerProfileProfileTab player={currentPlayer} />
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
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
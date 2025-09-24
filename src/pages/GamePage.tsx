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
import PlayerProfileProfileTab from '../components/PlayerProfileProfileTab';
import { loadAbilitySections } from '../services/classesContent';

import '../styles/swipe.css';

type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class' | 'profile';

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const lastTabKeyFor = (playerId: string) => `ut:lastActiveTab:${playerId}`;
const isValidTab = (t: string | null): t is TabKey =>
  t === 'combat' || t === 'abilities' || t === 'stats' || t === 'equipment' || t === 'class' || t === 'profile';

// IMPORTANT: ordre visuel de gauche à droite (PV/actions -> Classe -> Sorts -> Stats -> Sac -> Profil)
const TAB_ORDER: TabKey[] = ['combat', 'class', 'abilities', 'stats', 'equipment', 'profile'];

type GamePageProps = {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
  onUpdateCharacter?: (p: Player) => void;
};

// Gèle le scroll (préserve la position) pendant un drag swipe
function freezeScroll(): number {
  const y = window.scrollY || window.pageYOffset || 0;
  const body = document.body;
  (body as any).__scrollY = y;
  body.style.position = 'fixed';
  body.style.top = `-${y}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  body.style.overflowY = 'scroll';
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

  // Préchargement sections de classe (markdown)
  const [classSections, setClassSections] = useState<any[] | null>(null);

  // Onglet initial depuis localStorage
  const initialTab: TabKey = (() => {
    try {
      const saved = localStorage.getItem(lastTabKeyFor(selectedCharacter.id));
      return isValidTab(saved) ? saved : 'combat';
    } catch {
      return 'combat';
    }
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // Onglets visités (garder montés pour persistance et éviter “premiers rendus”)
  const [visitedTabs, setVisitedTabs] = useState<Set<TabKey>>(
    () => new Set<TabKey>(['combat', 'class', 'abilities']) // pré-monte les plus lourds
  );
  useEffect(() => {
    setVisitedTabs((prev) => {
      if (prev.has(activeTab)) return prev;
      const next = new Set(prev);
      next.add(activeTab);
      return next;
    });
  }, [activeTab]);

  // Conteneur et mesures
  const stageRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef<number>(0);

  // Références des wrappers pour mesurer leur hauteur
  const paneRefs = useRef<Record<TabKey, HTMLDivElement | null>>({} as any);

  // Swipe state
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const swipingRef = useRef<boolean>(false);
  const dragStartScrollYRef = useRef<number>(0);

  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [containerH, setContainerH] = useState<number | undefined>(undefined);

  // Lock de hauteur pendant switch par clic
  const [heightLocking, setHeightLocking] = useState(false);

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

  // Initialisation: connexion + player + inventaire
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

  // Détermination des voisins dans l’ordre visuel
  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const prevKey = activeIndex > 0 ? TAB_ORDER[activeIndex - 1] : null;
  const nextKey = activeIndex < TAB_ORDER.length - 1 ? TAB_ORDER[activeIndex + 1] : null;

  // Mesures
  const measurePaneHeight = useCallback((key: TabKey | null | undefined) => {
    if (!key) return 0;
    const el = paneRefs.current[key];
    return el?.offsetHeight ?? 0;
  }, []);

  const measureActiveHeight = useCallback(() => {
    const h = measurePaneHeight(activeTab);
    if (h) setContainerH(h);
  }, [activeTab, measurePaneHeight]);

  const measureDuringSwipe = useCallback(() => {
    const ch = measurePaneHeight(activeTab);
    const neighbor = dragX > 0 ? prevKey : dragX < 0 ? nextKey : null;
    const nh = measurePaneHeight(neighbor as any);
    const h = Math.max(ch, nh || 0);
    if (h) setContainerH(h);
  }, [activeTab, dragX, nextKey, prevKey, measurePaneHeight]);

  useEffect(() => {
    if (isInteracting || animating) return;
    const id = window.requestAnimationFrame(measureActiveHeight);
    return () => window.cancelAnimationFrame(id);
  }, [activeTab, isInteracting, animating, measureActiveHeight]);

  // Pointeurs (tactile/souris) pour swipe — transforme les wrappers persistants
  const onPointerDown: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (e.pointerType === 'mouse' && e.buttons !== 1) return;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    swipingRef.current = false;
    setAnimating(false);
    stageRef.current?.setPointerCapture?.(e.pointerId); 
  };

  const onPointerMove: React.PointerEventHandler<HTMLDivElement> = (e) => {
    if (startXRef.current == null || startYRef.current == null) return;
    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    // Déclenche si horizontal prédomine
    if (!swipingRef.current && Math.abs(dx) > 10 && Math.abs(Math.abs(dx) - Math.abs(dy)) > 4) {
      swipingRef.current = true;

      widthRef.current = stageRef.current?.clientWidth ?? widthRef.current;
      setIsInteracting(true);
      setContainerH(measurePaneHeight(activeTab)); // lock hauteur de départ
      dragStartScrollYRef.current = freezeScroll();
    }
    if (!swipingRef.current) return;

    e.preventDefault();

    let clamped = dx;
    if (!prevKey && clamped > 0) clamped = 0; // pas de page à gauche
    if (!nextKey && clamped < 0) clamped = 0; // pas de page à droite

    setDragX(clamped);

    const id = window.requestAnimationFrame(measureDuringSwipe);
    return () => window.cancelAnimationFrame(id);
  };

  const animateTo = (toPx: number, cb?: () => void) => {
    setAnimating(true);
    setDragX(toPx);
    window.setTimeout(() => {
      setAnimating(false);
      cb?.();
    }, 310);
  };

  const finishInteract = () => {
    setIsInteracting(false);
    setDragX(0);
    requestAnimationFrame(measureActiveHeight);
  };

  const onPointerUp: React.PointerEventHandler<HTMLDivElement> = () => {
    if (startXRef.current == null || startYRef.current == null) return;

    if (swipingRef.current) {
      const width = widthRef.current || (stageRef.current?.clientWidth ?? 0);
      const threshold = Math.max(48, width * 0.25);

      const commit = (dir: -1 | 1) => {
        const toPx = dir === 1 ? -width : width; // le panneau courant sort
        animateTo(toPx, () => {
          const next =
            dir === 1
              ? nextKey // aller à la page de droite (suivante)
              : prevKey; // aller à la page de gauche (précédente)
          if (next) {
            setActiveTab(next);
            try {
              localStorage.setItem(lastTabKeyFor(selectedCharacter.id), next);
            } catch {}
          }
          unfreezeScroll();
          stabilizeScroll(dragStartScrollYRef.current, 400);
          finishInteract();
        });
      };

      const cancel = () => {
        animateTo(0, () => {
          unfreezeScroll();
          stabilizeScroll(dragStartScrollYRef.current, 300);
          finishInteract();
        });
      };

      if (dragX <= -threshold && nextKey) {
        commit(1);
      } else if (dragX >= threshold && prevKey) {
        commit(-1);
      } else {
        cancel();
      }
    }

    startXRef.current = null;
    startYRef.current = null;
    swipingRef.current = false;
  };

  // Switch via clic: lock de hauteur (sans overlay/duplicat)
  const handleTabClickChange = useCallback((tab: string) => {
    if (!isValidTab(tab)) return;

    // Mesure hauteur actuelle (fromH)
    const fromH = measurePaneHeight(activeTab);
    if (fromH > 0) {
      setContainerH(fromH);
      setHeightLocking(true);
    }

    // Switch
    setActiveTab(tab as TabKey);

    // Mesure hauteur cible (toH) après rendu (double RAF)
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const toH = measurePaneHeight(tab as TabKey) || fromH;
        if (toH > 0) setContainerH(toH);

        // Relâche le lock après la transition
        setTimeout(() => {
          setHeightLocking(false);
          requestAnimationFrame(measureActiveHeight);
        }, 280);
      });
    });

    try {
      localStorage.setItem(lastTabKeyFor(selectedCharacter.id), tab);
    } catch {}
  }, [activeTab, selectedCharacter.id, measureActiveHeight, measurePaneHeight]);

  const handleBackToSelection = () => {
    try {
      sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1');
    } catch {}
    onBackToSelection?.();
    toast.success('Retour à la sélection des personnages');
  };

  // Rechargement d’inventaire lors d’un changement d’id
  useEffect(() => {
    async function loadInventory() {
      if (!selectedCharacter) return;
      try {
        const items = await inventoryService.getPlayerInventory(selectedCharacter.id);
        setInventory(items);
      } catch (e) {}
    }
    loadInventory();
  }, [selectedCharacter?.id]);

  // Préchargement sections de classe dès que le personnage change
  useEffect(() => {
    let cancelled = false;
    setClassSections(null);
    async function preloadClassContent() {
      const cls = selectedCharacter?.class;
      if (!cls) {
        setClassSections([]);
        return;
      }
      try {
        const res = await loadAbilitySections({
          className: cls,
          subclassName: (selectedCharacter as any)?.subclass ?? null,
          characterLevel: selectedCharacter?.level ?? 1,
        });
        if (!cancelled) setClassSections(res?.sections ?? []);
      } catch (e) {
        if (!cancelled) setClassSections([]);
      }
    }
    preloadClassContent();
    return () => { cancelled = true; };
  }, [selectedCharacter?.id, selectedCharacter?.class, (selectedCharacter as any)?.subclass, selectedCharacter?.level]);

  // Rendu d'un panneau selon la clé
  const renderPane = (key: TabKey) => {
    if (!currentPlayer) return null;
    switch (key) {
      case 'combat':
        return <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />;
      case 'class':
        return <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} sections={classSections} />;
      case 'abilities':
        return <AbilitiesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />;
      case 'stats':
        return <StatsTab player={currentPlayer} onUpdate={applyPlayerUpdate} />;
      case 'equipment':
        return (
          <EquipmentTab
            player={currentPlayer}
            inventory={inventory}
            onPlayerUpdate={applyPlayerUpdate}
            onInventoryUpdate={setInventory}
          />
        );
      case 'profile':
        return <PlayerProfileProfileTab player={currentPlayer} />;
      default:
        return null;
    }
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

  // Styles de déplacement pendant swipe: on applique transform sur les wrappers persistants
  const neighborType: 'prev' | 'next' | null = (() => {
    if (dragX > 0 && prevKey) return 'prev';
    if (dragX < 0 && nextKey) return 'next';
    return null;
  })();

  const currentTransform = `translate3d(${dragX}px, 0, 0)`;
  const neighborTransform =
    neighborType === 'next'
      ? `translate3d(calc(100% + ${dragX}px), 0, 0)`
      : neighborType === 'prev'
      ? `translate3d(calc(-100% + ${dragX}px), 0, 0)`
      : undefined;

  const showAsStatic = !isInteracting && !animating;

  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 no-overflow-anchor">
      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile player={currentPlayer} onUpdate={applyPlayerUpdate} />

            <TabNavigation activeTab={activeTab} onTabChange={handleTabClickChange} />

            {/* Stage: conteneur RELATIF, un seul arbre par onglet, persistant */}
            <div
              ref={stageRef}
              className="relative"
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              style={{
                touchAction: 'pan-y',
                height: (isInteracting || animating || heightLocking) ? containerH : undefined,
                transition: heightLocking ? 'height 280ms ease' : undefined,
              }}
            >
              {Array.from(visitedTabs).map((key) => {
                const isActive = key === activeTab;
                const isNeighbor =
                  (neighborType === 'next' && key === nextKey) ||
                  (neighborType === 'prev' && key === prevKey);

                // Mode statique: seul l'actif est affiché, en flux normal
                if (showAsStatic) {
                  return (
                    <div
                      key={key}
                      ref={(el) => { paneRefs.current[key] = el; }}
                      data-tab={key}
                      style={{
                        display: isActive ? 'block' : 'none',
                        position: 'relative', // en flux
                        transform: 'none',
                      }}
                    >
                      {key === 'class' && classSections === null ? (
                        <div className="py-12 text-center text-white/70">Chargement des aptitudes…</div>
                      ) : (
                        renderPane(key)
                      )}
                    </div>
                  );
                }

                // Mode interaction: activer l'actif et son voisin en absolute + transforms
                const display = isActive || isNeighbor ? 'block' : 'none';
                let transform = 'translate3d(0,0,0)';
                if (isActive) transform = currentTransform;
                if (isNeighbor && neighborTransform) transform = neighborTransform;

                return (
                  <div
                    key={key}
                    ref={(el) => { paneRefs.current[key] = el; }}
                    data-tab={key}
                    className={animating ? 'sv-anim' : undefined}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display,
                      transform,
                      willChange: isActive || isNeighbor ? 'transform' : undefined,
                    }}
                  >
                    {key === 'class' && classSections === null ? (
                      <div className="py-12 text-center text-white/70">Chargement des aptitudes…</div>
                    ) : (
                      renderPane(key)
                    )}
                  </div>
                );
              })}
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
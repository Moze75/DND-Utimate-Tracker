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

import { PlayerProfileSettingsModal } from '../components/PlayerProfileSettingsModal';

import '../styles/swipe.css';

/* ===========================================================
   Types & Constantes
   =========================================================== */
type TabKey = 'combat' | 'abilities' | 'stats' | 'equipment' | 'class' | 'profile';
const TAB_ORDER: TabKey[] = ['combat', 'class', 'abilities', 'stats', 'equipment', 'profile'];

const LAST_SELECTED_CHARACTER_SNAPSHOT = 'selectedCharacter';
const SKIP_AUTO_RESUME_ONCE = 'ut:skipAutoResumeOnce';
const lastTabKeyFor = (playerId: string) => `ut:lastActiveTab:${playerId}`;
const isValidTab = (t: string | null): t is TabKey =>
  t === 'combat' || t === 'abilities' || t === 'stats' || t === 'equipment' || t === 'class' || t === 'profile';

type GamePageProps = {
  session: any;
  selectedCharacter: Player;
  onBackToSelection: () => void;
  onUpdateCharacter?: (p: Player) => void;
};

/* ===========================================================
   Helpers Scroll (sécurisés)
   =========================================================== */
function reallyFreezeScroll(): number {
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
function reallyUnfreezeScroll() {
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

/* ===========================================================
   Composant principal
   =========================================================== */
export function GamePage({
  session,
  selectedCharacter,
  onBackToSelection,
  onUpdateCharacter,
}: GamePageProps) {
  /* ---------------- State principal ---------------- */
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(selectedCharacter);
  const [inventory, setInventory] = useState<any[]>([]);
  const [classSections, setClassSections] = useState<any[] | null>(null);

  // Onglet initial
  const initialTab: TabKey = (() => {
    try {
      const saved = localStorage.getItem(lastTabKeyFor(selectedCharacter.id));
      return isValidTab(saved) ? saved : 'combat';
    } catch {
      return 'combat';
    }
  })();
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);

  // PRE-MONTAGE COMPLET
  const [visitedTabs] = useState<Set<TabKey>>(
    () => new Set<TabKey>(['combat', 'class', 'abilities', 'stats', 'equipment', 'profile'])
  );

  // État modal Paramètres
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsSlideFrom, setSettingsSlideFrom] = useState<'left' | 'right'>('left');

  /* ---------------- Refs layout & swipe ---------------- */
  const stageRef = useRef<HTMLDivElement | null>(null);
  const widthRef = useRef<number>(0);
  const paneRefs = useRef<Record<TabKey, HTMLDivElement | null>>({} as any);

  // Geste
  const startXRef = useRef<number | null>(null);
  const startYRef = useRef<number | null>(null);
  const dragStartScrollYRef = useRef<number>(0);

  // Décision de direction
  const gestureDirRef = useRef<'undetermined' | 'horizontal' | 'vertical'>('undetermined');

  // Indique si le scroll est réellement gelé
  const freezeActiveRef = useRef(false);
  const freezeWatchdogRef = useRef<number | null>(null);
  const hasStabilizedRef = useRef(false);

  const [dragX, setDragX] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [isInteracting, setIsInteracting] = useState(false);
  const [containerH, setContainerH] = useState<number | undefined>(undefined);
  const [heightLocking, setHeightLocking] = useState(false);

  // Nouveau: mémorise la direction du voisin affiché pendant le drag pour le garder monté pendant l’animation
  const [latchedNeighbor, setLatchedNeighbor] = useState<'prev' | 'next' | null>(null);

  const prevPlayerId = useRef<string | null>(selectedCharacter?.id ?? null);

  /* ---------------- Scroll Freeze Safe API ---------------- */
  const safeFreeze = useCallback(() => {
    if (freezeActiveRef.current) return;
    freezeActiveRef.current = true;
    dragStartScrollYRef.current = reallyFreezeScroll();
    // Watchdog : force unfreeze si rien ne libère après 1.2s
    freezeWatchdogRef.current = window.setTimeout(() => {
      if (freezeActiveRef.current) {
        safeUnfreeze(true);
      }
    }, 1200);
  }, []);

  const safeUnfreeze = useCallback((forced = false) => {
    if (!freezeActiveRef.current) return;
    freezeActiveRef.current = false;
    if (freezeWatchdogRef.current) {
      clearTimeout(freezeWatchdogRef.current);
      freezeWatchdogRef.current = null;
    }
    reallyUnfreezeScroll();
    if (!forced) {
      stabilizeScroll(dragStartScrollYRef.current, 320);
    }
  }, []);

  const resetGestureState = useCallback(() => {
    startXRef.current = null;
    startYRef.current = null;
    gestureDirRef.current = 'undetermined';
    hasStabilizedRef.current = false;
  }, []);

  const fullAbortInteraction = useCallback(() => {
    setIsInteracting(false);
    setAnimating(false);
    setDragX(0);
    setLatchedNeighbor(null);
    if (freezeActiveRef.current) safeUnfreeze();
    resetGestureState();
  }, [resetGestureState, safeUnfreeze]);

  // Ouvrir/fermer la modale Paramètres
  const openSettings = useCallback(
    (dir: 'left' | 'right' = 'left') => {
      if (freezeActiveRef.current) safeUnfreeze(true); // si le scroll a été gelé par le swipe de tabs
      fullAbortInteraction(); // reset gestuelle des tabs en cours
      setSettingsSlideFrom(dir);
      setSettingsOpen(true);
    },
    [fullAbortInteraction, safeUnfreeze]
  );

  const closeSettings = useCallback(() => {
    setSettingsOpen(false);
  }, []);

  /* ---------------- Update player ---------------- */
  const applyPlayerUpdate = useCallback(
    (updated: Player) => {
      setCurrentPlayer(updated);
      try { onUpdateCharacter?.(updated); } catch {}
      try { localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(updated)); } catch {}
    },
    [onUpdateCharacter]
  );

  useEffect(() => {
    if (currentPlayer) {
      try { localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer)); } catch {}
    }
  }, [currentPlayer]);

  /* ---------------- Persistance snapshot & tab ---------------- */
  useEffect(() => {
    const persist = () => {
      if (!currentPlayer) return;
      try {
        localStorage.setItem(LAST_SELECTED_CHARACTER_SNAPSHOT, JSON.stringify(currentPlayer));
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
    try { localStorage.setItem(lastTabKeyFor(selectedCharacter.id), activeTab); } catch {}
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

  /* ---------------- Initialisation ---------------- */
  useEffect(() => {
    const initialize = async () => {
      try {
        setLoading(true);
        setConnectionError(null);
        const isConnected = await testConnection();
        if (!isConnected.success) throw new Error('Impossible de se connecter à la base de données');

        setCurrentPlayer((prev) =>
          prev && prev.id === selectedCharacter.id ? prev : selectedCharacter
        );
        const inventoryData = await inventoryService.getPlayerInventory(selectedCharacter.id);
        setInventory(inventoryData);
        setLoading(false);
      } catch (error: any) {
        console.error('Erreur d\'initialisation:', error);
        setConnectionError(error?.message ?? 'Erreur inconnue');
        setLoading(false);
      }
    };

    if (prevPlayerId.current !== selectedCharacter.id) {
      prevPlayerId.current = selectedCharacter.id;
      initialize();
    } else if (loading) {
      initialize();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCharacter.id]);

  /* ---------------- Préchargement Sections Classe ---------------- */
  useEffect(() => {
    let cancelled = false;
    setClassSections(null);
    async function preloadClassContent() {
      const cls = selectedCharacter?.class;
      if (!cls) { setClassSections([]); return; }
      try {
        const res = await loadAbilitySections({
          className: cls,
          subclassName: (selectedCharacter as any)?.subclass ?? null,
          characterLevel: selectedCharacter?.level ?? 1,
        });
        if (!cancelled) setClassSections(res?.sections ?? []);
      } catch {
        if (!cancelled) setClassSections([]);
      }
    }
    preloadClassContent();
    return () => { cancelled = true; };
  }, [selectedCharacter?.id, selectedCharacter?.class, (selectedCharacter as any)?.subclass, selectedCharacter?.level]);

  /* ---------------- Voisins d'onglet ---------------- */
  const activeIndex = TAB_ORDER.indexOf(activeTab);
  const prevKey = activeIndex > 0 ? TAB_ORDER[activeIndex - 1] : null;
  const nextKey = activeIndex < TAB_ORDER.length - 1 ? TAB_ORDER[activeIndex + 1] : null;

  /* ---------------- Mesures ---------------- */
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

  /* ---------------- Swipe tactile amélioré + sûreté ---------------- */
const HORIZONTAL_DECIDE_THRESHOLD = 10;   // déclenche un peu plus tôt
const HORIZONTAL_DOMINANCE_RATIO = 1.10;  // dominance horizontale légèrement moins stricte
// Nouveaux seuils "plus faciles"
const SWIPE_THRESHOLD_RATIO = 0.18;       // 18% de la largeur au lieu de 25%
const SWIPE_THRESHOLD_MIN_PX = 36;        // min 36px au lieu de 48px

// Flick: vitesse au-dessus de laquelle on valide même si la distance < seuil
// 0.35 px/ms = 350 px/s (ajuste si besoin entre 0.3 et 0.45)
const FLICK_VELOCITY_PX_PER_MS = 0.35;
  const onTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    gestureDirRef.current = 'undetermined';
    setAnimating(false);
    setLatchedNeighbor(null);
  };

  const onTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (startXRef.current == null || startYRef.current == null) return;

    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    const adx = Math.abs(dx);
    const ady = Math.abs(dy);

    // Décision
    if (gestureDirRef.current === 'undetermined') {
      if (adx >= HORIZONTAL_DECIDE_THRESHOLD || ady >= HORIZONTAL_DECIDE_THRESHOLD) {
        if (adx > ady * HORIZONTAL_DOMINANCE_RATIO) {
          gestureDirRef.current = 'horizontal';
          setIsInteracting(true);
          setContainerH(measurePaneHeight(activeTab));
          safeFreeze();
        } else {
          gestureDirRef.current = 'vertical';
          return; // Laisse le scroll natif
        }
      } else {
        return; // Pas encore décidé, ne rien faire
      }
    }

    if (gestureDirRef.current !== 'horizontal') {
      return; // Vertical : ne pas empêcher le scroll
    }

    // Horizontal confirmé
    e.preventDefault();

    let clamped = dx;
    if (!prevKey && clamped > 0) clamped = 0;
    if (!nextKey && clamped < 0) clamped = 0;

    // Mémorise le voisin en vue pour le garder monté pendant l’animation
    if (clamped > 0 && prevKey) {
      if (latchedNeighbor !== 'prev') setLatchedNeighbor('prev');
    } else if (clamped < 0 && nextKey) {
      if (latchedNeighbor !== 'next') setLatchedNeighbor('next');
    }

    setDragX(clamped);
    // Note: ce return n’annule pas le rAF (dans un handler React), on garde simple ici
    requestAnimationFrame(measureDuringSwipe);
  };

  // Déclenche la transition proprement: active d’abord l’anim, puis change le transform dans le frame suivant
  const animateTo = (toPx: number, cb?: () => void) => {
    setAnimating(true);
    requestAnimationFrame(() => {
      setDragX(toPx);
      window.setTimeout(() => {
        setAnimating(false);
        cb?.();
        setLatchedNeighbor(null); // libère le voisin verrouillé à la fin
      }, 310);
    });
  };

  const finishInteract = () => {
    setIsInteracting(false);
    setDragX(0);
    requestAnimationFrame(measureActiveHeight);
  };

  const onTouchEnd = () => {
    // Geste non démarré
    if (startXRef.current == null || startYRef.current == null) {
      resetGestureState();
      return;
    }

    if (gestureDirRef.current !== 'horizontal') {
      // Si on avait gelé par erreur (théoriquement non), on libère
      if (freezeActiveRef.current) safeUnfreeze();
      resetGestureState();
      return;
    }

    // Horizontal
    const width = widthRef.current || (stageRef.current?.clientWidth ?? 0);
    const threshold = Math.max(48, width * 0.25);

    const commit = (dir: -1 | 1) => {
      const toPx = dir === 1 ? -width : width;
      animateTo(toPx, () => {
        const next = dir === 1 ? nextKey : prevKey;
        if (next) {
          setActiveTab(next);
          try { localStorage.setItem(lastTabKeyFor(selectedCharacter.id), next); } catch {}
        }
        if (freezeActiveRef.current) safeUnfreeze();
        finishInteract();
        resetGestureState();
      });
    };

    const cancel = () => {
      animateTo(0, () => {
        if (freezeActiveRef.current) safeUnfreeze();
        finishInteract();
        resetGestureState();
      });
    };

    if (dragX <= -threshold && nextKey) commit(1);
    else if (dragX >= threshold && prevKey) commit(-1);
    else cancel();
  };

  // Sécurité: événements globaux qui doivent TOUJOURS libérer le scroll si gelé
  useEffect(() => {
    const safetyRelease = () => {
      if (freezeActiveRef.current) safeUnfreeze(true);
      fullAbortInteraction();
    };
    window.addEventListener('blur', safetyRelease);
    window.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') safetyRelease();
    });
    window.addEventListener('orientationchange', safetyRelease);
    window.addEventListener('resize', safetyRelease);
    window.addEventListener('pagehide', safetyRelease);
    return () => {
      safetyRelease();
      window.removeEventListener('blur', safetyRelease);
      window.removeEventListener('visibilitychange', safetyRelease);
      window.removeEventListener('orientationchange', safetyRelease);
      window.removeEventListener('resize', safetyRelease);
      window.removeEventListener('pagehide', safetyRelease);
    };
  }, [fullAbortInteraction, safeUnfreeze]);

  /* ---------------- Changement via clic nav ---------------- */
  const handleTabClickChange = useCallback((tab: string) => {
    if (!isValidTab(tab)) return;

    // Si pour une raison quelconque l'UI était "bloquée", reset
    if (freezeActiveRef.current) safeUnfreeze(true);
    resetGestureState();
    setIsInteracting(false);
    setAnimating(false);
    setDragX(0);
    setLatchedNeighbor(null);

    const fromH = measurePaneHeight(activeTab);
    if (fromH > 0) {
      setContainerH(fromH);
      setHeightLocking(true);
    }
    setActiveTab(tab as TabKey);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const toH = measurePaneHeight(tab as TabKey) || fromH;
        if (toH > 0) setContainerH(toH);
        setTimeout(() => {
          setHeightLocking(false);
          requestAnimationFrame(measureActiveHeight);
        }, 280);
      });
    });

    try { localStorage.setItem(lastTabKeyFor(selectedCharacter.id), tab); } catch {}
  }, [activeTab, selectedCharacter.id, measureActiveHeight, measurePaneHeight, resetGestureState, safeUnfreeze]);

  /* ---------------- Bouton retour ---------------- */
  const handleBackToSelection = () => {
    if (freezeActiveRef.current) safeUnfreeze(true);
    try { sessionStorage.setItem(SKIP_AUTO_RESUME_ONCE, '1'); } catch {}
    onBackToSelection?.();
    toast.success('Retour à la sélection des personnages');
  };

  /* ---------------- Reload inventaire (sécurité) ---------------- */
  useEffect(() => {
    async function loadInventory() {
      if (!selectedCharacter) return;
      try {
        const items = await inventoryService.getPlayerInventory(selectedCharacter.id);
        setInventory(items);
      } catch {}
    }
    loadInventory();
  }, [selectedCharacter?.id]);

  /* ---------------- Rendu d'un pane ---------------- */
  const renderPane = (key: TabKey) => {
    if (!currentPlayer) return null;
    switch (key) {
      case 'combat': {
        // Wrapper pour capturer swipe GAUCHE -> ouvrir paramètres (sans déclencher le swipe de tabs)
        return (
          <div
            onTouchStart={(e) => {
              const t = e.touches[0];
              (e.currentTarget as any).__sx = t.clientX;
              (e.currentTarget as any).__sy = t.clientY;
            }}
            onTouchMove={(e) => {
              const sx = (e.currentTarget as any).__sx ?? null;
              const sy = (e.currentTarget as any).__sy ?? null;
              if (sx == null || sy == null) return;
              const t = e.touches[0];
              const dx = t.clientX - sx;
              const dy = t.clientY - sy;
              // Seuils: dominance horizontale et mouvement vers la DROITE
              if (Math.abs(dx) > Math.abs(dy) * 1.15 && dx > 64) {
                e.stopPropagation();
                e.preventDefault();
                openSettings('left'); // au lieu de 'right' -> la modale entre depuis la GAUCHE
              }
            }}
            onTouchEnd={(e) => {
              (e.currentTarget as any).__sx = null;
              (e.currentTarget as any).__sy = null;
            }}
          >
            <CombatTab player={currentPlayer} onUpdate={applyPlayerUpdate} />
          </div>
        );
      }
      case 'class': return <ClassesTab player={currentPlayer} onUpdate={applyPlayerUpdate} sections={classSections} />;
      case 'abilities': return <AbilitiesTab player={currentPlayer} onUpdate={applyPlayerUpdate} />;
      case 'stats': return <StatsTab player={currentPlayer} onUpdate={applyPlayerUpdate} />;
      case 'equipment':
        return (
          <EquipmentTab
            player={currentPlayer}
            inventory={inventory}
            onPlayerUpdate={applyPlayerUpdate}
            onInventoryUpdate={setInventory}
          />
        );
      case 'profile': return <PlayerProfileProfileTab player={currentPlayer} />;
      default: return null;
    }
  };

  /* ---------------- Loading / Error ---------------- */
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

  /* ---------------- Swipe transforms ---------------- */
  const neighborTypeRaw: 'prev' | 'next' | null = (() => {
    if (dragX > 0 && prevKey) return 'prev';
    if (dragX < 0 && nextKey) return 'next';
    return null;
  })();
  // Pendant l’animation, garde le voisin verrouillé si dragX est revenu à 0
  const neighborType: 'prev' | 'next' | null =
    neighborTypeRaw ?? (animating ? latchedNeighbor : null);

  const currentTransform = `translate3d(${dragX}px, 0, 0)`;
  const neighborTransform =
    neighborType === 'next'
      ? `translate3d(calc(100% + ${dragX}px), 0, 0)`
      : neighborType === 'prev'
      ? `translate3d(calc(-100% + ${dragX}px), 0, 0)`
      : undefined;
  const showAsStatic = !isInteracting && !animating;

  /* ---------------- Rendu principal ---------------- */
  return (
    <div className="min-h-screen p-2 sm:p-4 md:p-6 no-overflow-anchor">
      {/* Zone de capture de SWIPE au bord gauche (ouvre la modale depuis la gauche) */}
      {!settingsOpen && (
        <div
          className="fixed inset-y-0 left-0 w-4 sm:w-5 z-50"
          onTouchStart={(e) => {
            const t = e.touches[0];
            (e.currentTarget as any).__sx = t.clientX;
            (e.currentTarget as any).__sy = t.clientY;
            (e.currentTarget as any).__edge = t.clientX <= 16;
          }}
          onTouchMove={(e) => {
            const sx = (e.currentTarget as any).__sx ?? null;
            const sy = (e.currentTarget as any).__sy ?? null;
            const edge = (e.currentTarget as any).__edge ?? false;
            if (!edge || sx == null || sy == null) return;
            const t = e.touches[0];
            const dx = t.clientX - sx;
            const dy = t.clientY - sy;
            if (Math.abs(dx) < 14) return;
            if (Math.abs(dx) > Math.abs(dy) * 1.15 && dx > 48) {
              e.stopPropagation();
              e.preventDefault();
              openSettings('left'); // ouverture depuis la gauche
            }
          }}
          onTouchEnd={(e) => {
            (e.currentTarget as any).__sx = null;
            (e.currentTarget as any).__sy = null;
            (e.currentTarget as any).__edge = false;
          }}
        >
          <div className="w-full h-full" aria-hidden />
        </div>
      )}

      <div className="w-full max-w-6xl mx-auto space-y-4 sm:space-y-6">
        {currentPlayer && (
          <PlayerContext.Provider value={currentPlayer}>
            <PlayerProfile player={currentPlayer} onUpdate={applyPlayerUpdate} />
            <TabNavigation activeTab={activeTab} onTabChange={handleTabClickChange} />

            <div
              ref={stageRef}
              className="relative"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              onTouchCancel={() => {
                // En cas de cancel, on abort proprement
                fullAbortInteraction();
              }}
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

                if (showAsStatic) {
                  return (
                    <div
                      key={key}
                      ref={(el) => { paneRefs.current[key] = el; }}
                      data-tab={key}
                      style={{
                        display: isActive ? 'block' : 'none',
                        position: 'relative',
                        transform: 'none'
                      }}
                    >
                      {key === 'class' && classSections === null
                        ? <div className="py-12 text-center text-white/70">Chargement des aptitudes…</div>
                        : renderPane(key)}
                    </div>
                  );
                }

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
                      willChange: isActive || isNeighbor ? 'transform' : undefined
                    }}
                  >
                    {key === 'class' && classSections === null
                      ? <div className="py-12 text-center text-white/70">Chargement des aptitudes…</div>
                      : renderPane(key)}
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

      {/* Modale Paramètres (fond opaque, couvre tout) */}
      {currentPlayer && (
        <PlayerProfileSettingsModal
          open={settingsOpen}
          onClose={closeSettings}
          player={currentPlayer}
          onUpdate={applyPlayerUpdate}
          slideFrom={settingsSlideFrom}
        />
      )}
    </div>
  );
}
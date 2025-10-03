import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ListChecks } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { ClassResources, Player } from '../types/dnd';
import { loadFeatureChecks, upsertFeatureCheck } from '../services/featureChecks';
import type { MarkdownCtx } from '../lib/markdownLite';

// Imports des modals
import { 
  AbilitySection, 
  PlayerLike, 
  canonicalClass, 
  sentenceCase, 
  getSubclassFromPlayerLike,
  getChaModFromPlayerLike 
} from './ClassesTab/modals/ClassUtilsModal';
import { ScreenRipple, createScreenRippleHandler } from './ClassesTab/modals/ClassEffectsModal';
import { AbilityCard } from './ClassesTab/modals/ClassAbilitiesModal';
import { 
  ClassResourcesCard, 
  mirrorMonkKeys, 
  buildDefaultsForClass 
} from './ClassesTab/modals/ClassResourcesModal';
import { loadSectionsSmart } from './ClassesTab/modals/ClassDataModal';

type Props = {
  player?: (PlayerLike & Partial<Player>) | null;
  playerClass?: string;
  className?: string;
  subclassName?: string | null;
  characterLevel?: number;
  onUpdate?: (player: Player) => void;

  // Nouveau: sections préchargées (depuis GamePage)
  sections?: AbilitySection[] | null;
};

const DEBUG = typeof window !== 'undefined' && (window as any).UT_DEBUG === true;

/* ===========================================================
   Composant principal
   =========================================================== */

function ClassesTab({
  player,
  playerClass,
  className,
  subclassName,
  characterLevel,
  onUpdate,
  sections: preloadedSections, // <- ajouté
}: Props) {
  
  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);

  const [checkedMap, setCheckedMap] = useState<Map<string, boolean>>(new Map());
  const [loadingChecks, setLoadingChecks] = useState(false);

  const [classResources, setClassResources] = useState<ClassResources | null | undefined>(player?.class_resources);

  // Effet visuel "ripple" plein écran
  const [screenRipple, setScreenRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const triggerScreenRippleFromEvent = createScreenRippleHandler(setScreenRipple);

  const rawClass = (player?.class ?? playerClass ?? className ?? '').trim();
  const rawSubclass = (getSubclassFromPlayerLike(player) ?? subclassName) ?? null;

  const displayClass = rawClass ? sentenceCase(rawClass) : '';
  const displaySubclass = rawSubclass ? sentenceCase(rawSubclass) : null;

  const finalLevelRaw = player?.level ?? characterLevel ?? 1;
  const finalLevel = Math.max(1, Number(finalLevelRaw) || 1);
  const characterId = player?.id ?? null;

  useEffect(() => {
    setClassResources(player?.class_resources);
  }, [player?.class_resources, player?.id]);

  // Charger les aptitudes (court-circuite si sections préchargées)
  useEffect(() => {
    let mounted = true;
  
    if (!rawClass) {
      setSections([]);
      setLoading(false);
      return () => { mounted = false; };
    }
  
    // Si GamePage a déjà préchargé les sections, on les utilise directement
    if (preloadedSections) {
      setSections(preloadedSections);
      setLoading(false);
      return () => { mounted = false; };
    }
  
    // Si GamePage est EN TRAIN de précharger (null), on affiche le loader
    if (preloadedSections === null) {
      setLoading(true);
      return () => { mounted = false; };
    }
  
    // Fallback: comportement existant (auto-fetch depuis ce composant)
    (async () => {
      setLoading(true);
      try {
        const res = await loadSectionsSmart({ className: rawClass, subclassName: rawSubclass, level: finalLevel });
        if (!mounted) return;
        setSections(res);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadSectionsSmart error:', e);
        if (!mounted) return;
        setSections([]);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
  
    return () => {
      mounted = false;
    };
  }, [preloadedSections, rawClass, rawSubclass, finalLevel]);

  // Charger l'état des cases cochées (aptitudes) pour le personnage
  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoadingChecks(true);
      try {
        const map = await loadFeatureChecks(characterId);
        if (!mounted) return;
        setCheckedMap(map);
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] loadFeatureChecks error:', e);
        if (!mounted) return;
        setCheckedMap(new Map());
      } finally {
        if (mounted) setLoadingChecks(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [characterId]);

  // Evite double init en StrictMode (guard)
  const initKeyRef = useRef<string | null>(null);

  // Auto-init silencieuse des ressources manquantes
  useEffect(() => {
    (async () => {
      if (!player?.id || !displayClass) return;

      const cls = canonicalClass(displayClass);
      if (!cls) return;

      const ensureKey = `${player.id}:${cls}:${finalLevel}`;
      if (initKeyRef.current === ensureKey) return;

      const current: Record<string, any> = { ...(classResources || {}) };
      const defaults = buildDefaultsForClass(cls, finalLevel, player);

      let changed = false;
      for (const [k, v] of Object.entries(defaults)) {
        if (current[k] === undefined || current[k] === null) {
          current[k] = v;
          changed = true;
        }
      }

      if (!changed) return;

      initKeyRef.current = ensureKey;
      try {
        const { error } = await supabase.from('players').update({ class_resources: current }).eq('id', player.id);
        if (error) throw error;

        setClassResources(current as ClassResources);

        if (onUpdate && player) {
          onUpdate({ ...(player as any), class_resources: current } as Player);
        }
      } catch (e) {
        initKeyRef.current = null;
        console.error('[ClassesTab] auto-init class_resources error:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player?.id, displayClass, finalLevel, classResources, player]);

  // Barde: cap dynamique pour Inspiration bardique = modificateur de Charisme
  const bardCapRef = useRef<string | null>(null);
  useEffect(() => {
    (async () => {
      if (!player?.id || !displayClass) return;
      if (canonicalClass(displayClass) !== 'Barde') return;

      const cap = Math.max(0, getChaModFromPlayerLike(player));
      const total = (classResources as any)?.bardic_inspiration;
      const used = (classResources as any)?.used_bardic_inspiration || 0;

      const key = `${player.id}:${cap}:${total ?? 'u'}:${used}`;
      if (bardCapRef.current === key) return;

      if (typeof cap !== 'number') return;

      if (typeof total !== 'number' || total !== cap || used > cap) {
        const next = {
          ...(classResources || {}),
          bardic_inspiration: cap,
          used_bardic_inspiration: Math.min(used, cap),
        };

        try {
          const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
          if (error) throw error;

          setClassResources(next as ClassResources);
          bardCapRef.current = key;

          if (onUpdate && player) {
            onUpdate({ ...(player as any), class_resources: next } as Player);
          }
        } catch (e) {
          console.error('[ClassesTab] bard cap update error:', e);
          bardCapRef.current = null;
        }
      } else {
        bardCapRef.current = key;
      }
    })();
  }, [
    player?.id,
    displayClass,
    player?.stats?.charisma,
    player?.stats?.CHA,
    player?.charisma,
    player?.CHA,
    player?.ability_scores?.cha,
    player?.abilities,
    classResources?.bardic_inspiration,
    classResources?.used_bardic_inspiration,
    onUpdate,
    player,
  ]);

  async function handleToggle(featureKey: string, checked: boolean) {
    setCheckedMap(prev => {
      const next = new Map(prev);
      next.set(featureKey, checked);
      return next;
    });
    try {
      await upsertFeatureCheck({
        characterId,
        className: displayClass,
        subclassName: displaySubclass ?? null,
        featureKey,
        checked,
      });
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] upsertFeatureCheck error:', e);
    }
  }

  // Guard: ne pas ouvrir automatiquement au tout premier rendu
  const firstMountRef = useRef(true);
  useEffect(() => {
    firstMountRef.current = false;
  }, []);
    
  /* ===========================================================
     UI: rendu
     =========================================================== */

  const visible = useMemo(
    () =>
      sections
        .filter((s) => (typeof s.level === 'number' ? s.level <= finalLevel : true))
        .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0)),
    [sections, finalLevel]
  );

  const hasClass = !!displayClass;
  const hasSubclass = !!displaySubclass;

  return (
    <>
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-violet-700/30 via-fuchsia-600/20 to-amber-600/20 border border-white/10 rounded-2xl px-4 py-3 ring-1 ring-black/5 shadow-md shadow-black/20">
          <div className="flex items-center justify-between">
            {/* Libellé classe / sous-classe avec message si manquante (à partir du niveau 3) */}
            <span className="text-sm font-semibold text-white">
              {hasClass ? displayClass : '—'}
              {hasClass && (
                <>
                  {hasSubclass ? (
                    <span className="ml-2 font-normal text-white/80">- {displaySubclass}</span>
                  ) : finalLevel >= 3 ? (
                    <span className="ml-2 font-normal text-red-400">Sélectionnez votre sous-classe dans les paramètres</span>
                  ) : null}
                </>
              )}
            </span>

            {/* Niveau */}
            <span className="text-xs text-white/70">Niveau {finalLevel}</span>
          </div>
        </div>

        {hasClass && (
          <ClassResourcesCard
            playerClass={displayClass}
            resources={classResources || undefined}
            onUpdateResource={updateClassResource}
            player={player ?? undefined}
            level={finalLevel}
            onPulseScreen={triggerScreenRippleFromEvent}
          />
        )}

        {!hasClass ? (
          <div className="text-center text-white/70 py-10">Sélectionne une classe pour afficher les aptitudes.</div>
        ) : loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-400" />
          </div>
        ) : visible.length === 0 ? (
          <div className="text-center text-white/70 py-10">
            Aucune aptitude trouvée pour "{displayClass}{displaySubclass ? ` - ${displaySubclass}` : ''}".
            {DEBUG && (
              <pre className="mt-3 text-xs text-white/60">
                Activez window.UT_DEBUG = true pour voir les tentatives de chargement dans la console.
              </pre>
            )}
          </div>
        ) : (
          <>
            <div className="stat-header flex items-center gap-3 pt-1">
              <ListChecks className="w-5 h-5 text-sky-500" />
              <h3 className="text-lg font-semibold text-gray-100">Compétences de classe et sous-classe</h3>
            </div>

            <div className="space-y-4">
          {visible.map((s, i) => (
            <AbilityCard
              key={`${s.origin}-${s.level ?? 'x'}-${i}`}
              section={s}
              defaultOpen={false}
              ctx={{
                characterId,
                className: displayClass,
                subclassName: displaySubclass,
                checkedMap,
                onToggle: handleToggle,
              }}
              disableContentWhileLoading={loadingChecks}
            />
          ))}
            </div>
          </>
        )}
      </div>

      {/* Overlay ripple plein écran */}
      {screenRipple && (
        <ScreenRipple
          key={screenRipple.key}
          x={screenRipple.x}
          y={screenRipple.y}
          onDone={() => setScreenRipple(null)}
        />
      )}
    </>
  );

  /* ===========================================================
     Handlers
     =========================================================== */

  async function updateClassResource(
    resource: keyof ClassResources,
    value: ClassResources[keyof ClassResources]
  ) {
    if (!player?.id) return;

    // Totaux calculés automatiquement: bloquer leur édition
    if (resource === 'bardic_inspiration') {
      toast.error("Le total d'Inspiration bardique est calculé automatiquement (modificateur de Charisme).");
      return;
    }
    if (resource === 'lay_on_hands') {
      toast.error("Le total d'Imposition des mains est calculé automatiquement (5 × niveau de Paladin).");
      return;
    }

    const next: any = { ...(classResources || {}) };

    // Barde: clamp used à [0..cap CHA]
    if (resource === 'used_bardic_inspiration' && typeof value === 'number') {
      const cap = Math.max(0, getChaModFromPlayerLike(player));
      next.used_bardic_inspiration = Math.min(Math.max(0, value), cap);
    }
    // Paladin: clamp used à [0..(5 × niveau)]
    else if (resource === 'used_lay_on_hands' && typeof value === 'number') {
      const lvl = Number(player?.level || 0);
      const cap = Math.max(0, lvl * 5);
      next.used_lay_on_hands = Math.min(Math.max(0, value), cap);
    } else {
      next[resource] = value;
    }

    // Moine: miroirs ki/credo
    mirrorMonkKeys(resource, value, next);

    try {
      const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
      if (error) throw error;

      setClassResources(next as ClassResources);

      if (onUpdate && player) {
        onUpdate({ ...(player as any), class_resources: next } as Player);
      }

      if (typeof value === 'boolean') {
        toast.success(`Récupération arcanique ${value ? 'utilisée' : 'disponible'}`);
      } else {
        const resourceNames: Record<string, string> = {
          rage: 'Rage',
          bardic_inspiration: 'Inspiration bardique',
          channel_divinity: 'Conduit divin',
          wild_shape: 'Forme sauvage',
          sorcery_points: 'Points de sorcellerie',
          action_surge: "Second souffle",
          credo_points: 'Points de crédo',
          ki_points: 'Points de crédo',
          lay_on_hands: 'Imposition des mains',
          favored_foe: 'Ennemi juré',
          sneak_attack: 'Attaque sournoise',
          pact_magic: 'Magie de pacte',
          supernatural_metabolism: 'Métabolisme surnaturel',
          innate_sorcery: 'Sorcellerie innée', 
        };

        const key = String(resource);
        const displayKey = key.replace('used_', '');
        const resourceName = resourceNames[displayKey] || displayKey;
        const isUsed = key.startsWith('used_');
        const previous = (classResources as any)?.[resource];
        const action =
          isUsed && typeof previous === 'number' && typeof value === 'number'
            ? value > previous
              ? 'utilisé'
              : 'récupéré'
            : 'mis à jour';

        if (isUsed && typeof previous === 'number' && typeof value === 'number') {
          const diff = Math.abs((value as number) - (previous as number));
          toast.success(`${diff} ${resourceName} ${action}`);
        } else {
          toast.success(`${resourceName} ${action}`);
        }
      }
    } catch (err) {
      console.error('Erreur lors de la mise à jour des ressources:', err);
      toast.error('Erreur lors de la mise à jour');
    }
  }
}

export default ClassesTab;
export { ClassesTab };
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Sparkles,
  Flame,
  Music,
  Cross,
  Leaf,
  Wand2,
  Swords,
  HandHeart,
  Target,
  Skull,
  BookOpen,
  Save,
  X,
  Plus,
  Minus,
  ListChecks,
} from 'lucide-react';

import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { ClassResources, Player } from '../types/dnd';
import { loadFeatureChecks, upsertFeatureCheck } from '../services/featureChecks';
import { loadAbilitySections } from '../services/classesContent';
import { MarkdownLite, type MarkdownCtx } from '../lib/markdownLite';

/* ===========================================================
   Types externes
   =========================================================== */

type AbilitySection = {
  level: number;
  title: string;
  content: string;
  origin: 'class' | 'subclass';
};

type PlayerLike = {
  id?: string | null;
  class?: string | null;
  subclass?: string | null;
  level?: number | null;
  class_resources?: ClassResources | null;
  // champs optionnels utiles pour extraire le modificateur de Charisme
  stats?: { charisma?: number; CHA?: number } | null;
  charisma?: number;
  CHA?: number;
  ability_scores?: { cha?: number } | null;
  abilities?: any; // objet ou tableau selon les modèles
};

type Props = {
  player?: (PlayerLike & Partial<Player>) | null;
  playerClass?: string;
  className?: string;
  subclassName?: string | null;
  characterLevel?: number;
  onUpdate?: (player: Player) => void;
};

const DEBUG = typeof window !== 'undefined' && (window as any).UT_DEBUG === true;

/* ===========================================================
   Aides noms / alias (aligné “règles 2024”
   =========================================================== */

const CLASS_ALIASES: Record<string, string[]> = {
  barbare: ['Barbare', 'Barbarian'],
  barde: ['Barde', 'Bard'],
  clerc: ['Clerc', 'Cleric', 'Prêtre', 'Pretre'],
  druide: ['Druide', 'Druid'],
  ensorceleur: ['Ensorceleur', 'Sorcerer', 'Sorceror'],
  guerrier: ['Guerrier', 'Fighter'],
  magicien: ['Magicien', 'Wizard', 'Mage'],
  moine: ['Moine', 'Monk'],
  paladin: ['Paladin'],
  rodeur: ['Rôdeur', 'Rodeur', 'Ranger'],
  roublard: ['Roublard', 'Voleur', 'Rogue', 'Thief'],
  // Nouveau: Occultiste = Warlock (VF moderne “Sorcier”)
  occultiste: ['Occultiste', 'Warlock', 'Sorcier'],
};

// Clés normalisées (sans accents / tirets), valeurs: variantes FR/EN pour la recherche
const SUBCLASS_ALIASES: Record<string, string[]> = {
  /* ============================
   * Barbare – 2024
   * ============================ */

  'voie de l arbre monde': ['Voie de l’Arbre-Monde', 'Voie de l arbre-monde', 'Voie de l arbre monde', 'Path of the World Tree'],
  'voie du berserker': ['Voie du Berserker', 'Berserker', 'Path of the Berserker'],
  'voie du coeur sauvage': ['Voie du Cœur sauvage', 'Voie du Coeur sauvage', 'Path of the Wild Heart'],
  'voie du zelateur': ['Voie du Zélateur', 'Voie du Zelateur', 'Path of the Zealot'],

  /* ============================
   * Barde – 2024
   * ============================ */
  
  'college de la danse': ['Collège de la Danse', 'College de la Danse', 'College of Dance'],
  'college du savoir': ['Collège du Savoir', 'College du savoir', 'College of Lore', 'Lore'],
  'college de la seduction': ['Collège de la Séduction', 'College de la Seduction', 'College of     Glamour', 'Glamour'],
  'college de la vaillance': ['Collège de la Vaillance', 'College de la Vaillance', 'College of   Valor', 'Valor'],


  /* ============================
   * Clerc – 2024
   * ============================ */
'domaine de la guerre': ['Domaine de la Guerre', 'War Domain'],
  'domaine de la lumiere': ['Domaine de la Lumière', 'Light Domain'],
  'domaine de la ruse': ['Domaine de la Ruse', 'Trickery Domain'],
  'domaine de la vie': ['Domaine de la Vie', 'Life Domain'],


  /* ============================
   * Druide – 2024
   * ============================ */
'cercle des astres': ['Cercle des Astres', 'Circle of Stars', 'Stars'],
  'cercle de la lune': ['Cercle de la Lune', 'Circle of the Moon', 'Moon'],
  'cercle des mers': ['Cercle des Mers', 'Circle of the Sea', 'Sea'],
  'cercle de la terre': ['Cercle de la Terre', 'Circle of the Land', 'Land'],


  /* ============================
   * Ensorceleur – 2024
   * (Les "Options de Métamagie" ne sont pas une sous-classe mais un regroupement)
   * ============================ */
 'sorcellerie aberrante': ['Sorcellerie aberrante', 'Aberrant Sorcery', 'Aberrant Mind'],
  'sorcellerie draconique': ['Sorcellerie draconique'],
  'sorcellerie mecanique': ['Sorcellerie mécanique'],
  'sorcellerie sauvage': ['Sorcellerie sauvage'],


  /* ============================
   * Guerrier – 2024
   * ============================ */
  champion: ['Champion', 'Champion Fighter'],
  'chevalier occultiste': ['Chevalier occultiste', 'Eldritch Knight'],
  'maitre de guerre': ['Maître de guerre', 'Maitre de guerre', 'Battle Master', 'Battlemaster'],
  'soldat psi': ['Soldat psi', 'Psi Warrior', 'Psychic Warrior'],


  /* ============================
   * Magicien – 2024
   * ============================ */
 abjurateur: ['Abjurateur', 'Abjuration', 'School of Abjuration'],
  devin: ['Devin', 'Divination', 'School of Divination'],
  evocation: ['Évocation', 'Evocation', 'School of Evocation'],
  illusionniste: ['Illusionniste', 'Illusion', 'School of Illusion'],

  /* ============================
   * Moine – 2024
   * ============================ */
'credo des elements': ['Crédo des Éléments', 'Credo des Elements', 'Way of the Four Elements'],
  'credo de la misericorde': ['Crédo de la Miséricorde', 'Credo de la Misericorde', 'Way of Mercy'],
  'credo de l ombre': ['Crédo de l’Ombre', 'Credo de l Ombre', 'Way of Shadow', 'Shadow'],
  'credo de la paume': ['Crédo de la Paume'],


  /* ============================
   * Occultiste (Warlock) – 2024
   * ============================ */
'protecteur archifee': ['Protecteur Archifée', 'Archfey', 'The Archfey'],
  'protecteur celeste': ['Protecteur Céleste', 'Celeste', 'The Celestial', 'Celestial'],
  'protecteur felon': ['Protecteur Félon', 'Protecteur Felon', 'The Fiend', 'Fiend'],
  'protecteur grand ancien': ['Protecteur Grand Ancien', 'The Great Old One', 'Great Old One'],

  // Paladin

  /* ============================
   * Paladin – 2024
   * ============================ */
  'serment de gloire': ['Serment de Gloire', 'Oath of Glory'],
  'serment des anciens': ['Serment des Anciens', 'Oath of the Ancients'],
  'serment de devotion': ['Serment de Dévotion', 'Serment de Devotion', 'Oath of Devotion'],
  'serment de vengeance': ['Serment de Vengeance', 'Oath of Vengeance'],


  /* ============================
   * Rôdeur – 2024
   * ============================ */
  belluaire: ['Belluaire', 'Beast Master', 'Beastmaster'],
  chasseur: ['Chasseur', 'Hunter'],
  'traqueur des tenebres': ['Traqueur des ténèbres', 'Traqueur des tenebres', 'Gloom Stalker'],
  'vagabond feerique': ['Vagabond féérique', 'Vagabond feerique', 'Fey Wanderer'],

  /* ============================
   * Roublard – 2024
   * ============================ */
 'ame aceree': ['Âme acérée', 'Ame aceree', 'Soulknife'],
  'arnaqueur arcanique': ['Arnaqueur arcanique', 'Arcane Trickster'],
  assassin: ['Assassin'],
  voleur: ['Voleur', 'Thief'],
};

/* ===========================================================
   Utils textes
   =========================================================== */

function norm(s: string) {
  return (s || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function canonicalClass(name: string): string {
  const n = norm(name);

  if (['barbare', 'barbarian'].includes(n)) return 'Barbare';
  if (['barde', 'bard'].includes(n)) return 'Barde';
  if (['clerc', 'cleric', 'pretre', 'prêtre', 'pretres'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';

  // Ensorceleur = Sorcerer
  if (['ensorceleur', 'sorcerer', 'sorceror'].includes(n)) return 'Ensorceleur';

  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  // Magicien = Wizard (on accepte “mage”)
  if (['magicien', 'wizard', 'mage'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue', 'thief'].includes(n)) return 'Roublard';

  // Occultiste = Warlock (et “Sorcier” en VF moderne)
  if (['occultiste', 'warlock', 'sorcier'].includes(n)) return 'Occultiste';

  return name || '';
}

function sentenceCase(s: string) {
  const t = (s || '').toLocaleLowerCase('fr-FR').trim();
  if (!t) return t;
  const first = t.charAt(0).toLocaleUpperCase('fr-FR') + t.slice(1);
  return first.replace(/\b([A-Z]{2,})\b/g, '$1');
}

function uniq<T>(arr: T[]): T[] {
  return Array.from(new Set(arr));
}

function stripParentheses(s: string) {
  return (s || '').replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s{2,}/g, ' ').trim();
}

function stripDiacritics(s: string) {
  return (s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function slug(s: string) {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/* ===========================================================
   Helper sous-classe robuste (plusieurs noms possibles)
   =========================================================== */
function getSubclassFromPlayerLike(p?: any): string | null {
  if (!p) return null;
  const candidates = [p?.subclass, p?.sub_class, p?.subClass, p?.sousClasse, p?.['sous-classe']];
  const found = candidates.find((v) => typeof v === 'string' && v.trim().length > 0);
  return found ? String(found).trim() : null;
}

/* ===========================================================
   Helper robuste: modificateur de Charisme
   =========================================================== */

function getChaModFromPlayerLike(p?: any): number {
  if (!p) return 0;

  const toNum = (v: any): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v.replace(/[^\d+-]/g, ''));
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  let chaObj: any = null;
  const abilities = p?.abilities;
  if (Array.isArray(abilities)) {
    chaObj = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return n === 'charisme' || n === 'charisma' || n === 'cha' || n === 'car';
    });
  } else if (abilities && typeof abilities === 'object') {
    const keys = Object.keys(abilities);
    const key =
      keys.find(k => {
        const kk = k.toLowerCase();
        return kk === 'charisme' || kk === 'charisma' || kk === 'cha' || kk === 'car';
      }) ??
      keys.find(k => k.toLowerCase().includes('charis') || k.toLowerCase() === 'cha' || k.toLowerCase() === 'car');
    if (key) chaObj = abilities[key];
  }

  if (chaObj) {
    const mod = toNum(chaObj.modifier) ?? toNum(chaObj.mod) ?? toNum(chaObj.modValue) ?? toNum(chaObj.value);
    if (mod != null) return mod;
    const score = toNum(chaObj.score) ?? toNum(chaObj.total) ?? toNum(chaObj.base);
    if (score != null) return Math.floor((score - 10) / 2);
  }

  const score2 =
    p?.stats?.charisma ??
    p?.stats?.CHA ??
    p?.charisma ??
    p?.CHA ??
    p?.ability_scores?.cha ??
    p?.abilities?.cha ??
    null;

  if (typeof score2 === 'number') return Math.floor((score2 - 10) / 2);

  return 0;
}

/* ===========================================================
   Overlay ripple plein écran (effet visuel)
   =========================================================== */

function ScreenRipple({
  x,
  y,
  onDone,
  duration = 750,
  color = 'rgba(168,85,247,0.28)', // violet 500 ~ #a855f7 avec alpha
  blur = 2,
}: {
  x: number;
  y: number;
  onDone: () => void;
  duration?: number;
  color?: string;
  blur?: number;
}) {
  const circleRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const circle = circleRef.current;
    if (!circle) return;

    const w = window.innerWidth;
    const h = window.innerHeight;

    // distance max jusqu'à un coin (pour couvrir tout l'écran)
    const dTopLeft = Math.hypot(x - 0, y - 0);
    const dTopRight = Math.hypot(x - w, y - 0);
    const dBottomLeft = Math.hypot(x - 0, y - h);
    const dBottomRight = Math.hypot(x - w, y - h);
    const maxR = Math.max(dTopLeft, dTopRight, dBottomLeft, dBottomRight);

    const finalDiameter = Math.ceil(maxR * 2) + 2 * blur;

    // Position/size fixes, animée via scale
    circle.style.width = `${finalDiameter}px`;
    circle.style.height = `${finalDiameter}px`;
    circle.style.left = `${x}px`;
    circle.style.top = `${y}px`;
    circle.style.transform = 'translate(-50%, -50%) scale(0.01)';
    circle.style.opacity = '0.75';

    // Déclenche l’animation (scale vers 1 + fadeout)
    const raf = requestAnimationFrame(() => {
      circle.style.transition = `transform ${duration}ms ease-out, opacity ${duration + 100}ms ease-in`;
      circle.style.transform = 'translate(-50%, -50%) scale(1)';
      circle.style.opacity = '0';
    });

    const to = window.setTimeout(() => {
      onDone();
    }, duration + 140);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(to);
    };
  }, [x, y, onDone, duration, blur]);

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 70, // au-dessus de l’UI
      }}
    >
      {/* Cercle expansif */}
      <div
        ref={circleRef}
        style={{
          position: 'fixed',
          borderRadius: '9999px',
          left: 0,
          top: 0,
          transform: 'translate(-50%, -50%) scale(0.01)',
          willChange: 'transform, opacity',
          background: `radial-gradient(closest-side, ${color}, rgba(168,85,247,0.18), rgba(168,85,247,0.0))`,
          boxShadow: `0 0 ${blur * 4}px ${color}`,
          opacity: 0,
        }}
      />
    </div>
  );
}

/* ===========================================================
   Composant principal
   =========================================================== */

function ClassesTab({ player, playerClass, className, subclassName, characterLevel, onUpdate }: Props) {
  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);

  const [checkedMap, setCheckedMap] = useState<Map<string, boolean>>(new Map());
  const [loadingChecks, setLoadingChecks] = useState(false);

  const [classResources, setClassResources] = useState<ClassResources | null | undefined>(player?.class_resources);

  // Effet visuel “ripple” plein écran
  const [screenRipple, setScreenRipple] = useState<{ x: number; y: number; key: number } | null>(null);
  const triggerScreenRippleFromEvent = (ev: React.MouseEvent<HTMLElement>) => {
    const el = ev.currentTarget as HTMLElement;
    const rect = el.getBoundingClientRect();
    const x = Math.round(rect.left + rect.width / 2);
    const y = Math.round(rect.top + rect.height / 2);
    setScreenRipple({ x, y, key: Date.now() });
  };

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

  // Charger les aptitudes
  useEffect(() => {
    let mounted = true;
    if (!rawClass) {
      setSections([]);
      return;
    }
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
  }, [rawClass, rawSubclass, finalLevel]);

  // Charger l’état des cases cochées (aptitudes) pour le personnage
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
            {/* Libellé classe / sous-classe avec message si manquante */}
            <span className="text-sm font-semibold text-white">
              {hasClass ? displayClass : '—'}
              {hasClass && (
                <span className={`ml-2 font-normal ${hasSubclass ? 'text-white/80' : 'text-red-400'}`}>
                  {hasSubclass ? `- ${displaySubclass}` : 'Sélectionnez votre sous-classe dans les paramètres'}
                </span>
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
            Aucune aptitude trouvée pour “{displayClass}{displaySubclass ? ` - ${displaySubclass}` : ''}”.
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
                  defaultOpen={s.level === finalLevel}
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
          action_surge: "Sursaut d'action",
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

/* ===========================================================
   Chargement "smart" avec alias
   =========================================================== */

async function loadSectionsSmart(params: { className: string; subclassName: string | null; level: number }): Promise<AbilitySection[]> {
  const { className, subclassName, level } = params;
  const clsNorm = norm(className);
  const subNorm = subclassName ? norm(subclassName) : '';

  const classCandidatesBase = uniq([
    className,
    stripDiacritics(className),
    stripParentheses(className),
    sentenceCase(className),
  ]).filter(Boolean) as string[];

  const subclassCandidatesBase = uniq([
    subclassName ?? '',
    stripParentheses(subclassName ?? ''),
    stripDiacritics(subclassName ?? ''),
    sentenceCase(subclassName ?? ''),
  ]).filter(Boolean) as string[];

  const classAlias = CLASS_ALIASES[clsNorm] ?? [];
  const subclassAlias = subNorm ? (SUBCLASS_ALIASES[subNorm] ?? []) : [];

  const classCandidates = uniq([...classCandidatesBase, ...classAlias]).filter(Boolean) as string[];
  const subclassCandidates = uniq([...subclassCandidatesBase, ...subclassAlias]).filter(Boolean) as string[];

  if (DEBUG) {
    console.debug('[ClassesTab] Tentatives de chargement', {
      input: { className, subclassName, level },
      normalized: { clsNorm, subNorm },
      classCandidates,
      subclassCandidates,
    });
  }

  // Essayer class + subclass
  for (const c of classCandidates) {
    for (const sc of subclassCandidates) {
      try {
        if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try', { className: c, subclassName: sc, level });
        const res = await loadAbilitySections({ className: c, subclassName: sc, characterLevel: level });
        const secs = (res?.sections ?? []) as AbilitySection[];
        if (Array.isArray(secs) && secs.length > 0) {
          if (DEBUG) console.debug('[ClassesTab] -> OK', { className: c, subclassName: sc, count: secs.length });
          return secs;
        }
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] -> KO', { className: c, subclassName: sc, error: e });
      }
    }
  }

  // Essayer class seule
  for (const c of classCandidates) {
    try {
      if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try (class only)', { className: c, level });
      const res = await loadAbilitySections({ className: c, subclassName: null, characterLevel: level });
      const secs = (res?.sections ?? []) as AbilitySection[];
      if (Array.isArray(secs) && secs.length > 0) {
        if (DEBUG) console.debug('[ClassesTab] -> OK (class only)', { className: c, count: secs.length });
        return secs;
      }
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] -> KO (class only)', { className: c, error: e });
    }
  }

  return [];
}

/* ===========================================================
   UI: cartes & rendu
   =========================================================== */

function AbilityCard({
  section,
  defaultOpen,
  ctx,
  disableContentWhileLoading,
}: {
  section: AbilitySection;
  defaultOpen?: boolean;
  ctx: MarkdownCtx;
  disableContentWhileLoading?: boolean;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const contentId = `ability-${section.origin}-${section.level ?? 'x'}-${slug(section.title)}`;

  // Mesure dynamique pour supprimer toute limite de hauteur lorsqu'ouvert
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [maxHeight, setMaxHeight] = useState<number>(0);

  // Met à jour la hauteur max quand on ouvre/ferme ou quand le contenu change
  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    if (open) {
      // Mesure immédiate
      setMaxHeight(el.scrollHeight);

      // Observe les changements de taille du contenu (Markdown long, images, etc.)
      const ro = new ResizeObserver(() => {
        setMaxHeight(el.scrollHeight);
      });
      ro.observe(el);
      return () => ro.disconnect();
    } else {
      setMaxHeight(0);
    }
  }, [open, section.content]);

  return (
    <article
      className={[
        'rounded-xl border ring-1 ring-black/5 shadow-lg shadow-black/20',
        'border-amber-700/30',
        'bg-[radial-gradient(ellipse_at_top_left,rgba(120,53,15,.12),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(91,33,182,.10),transparent_45%)]',
      ].join(' ')}
    >
      <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls={contentId} className="w-full text-left">
        <div className="flex items-start gap-3 p-4">
          {/* Étiquette de niveau supprimée pour éviter le doublon */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base sm:text-lg truncate">{sentenceCase(section.title)}</h3>
              <OriginPill origin={section.origin} />
            </div>
          </div>

          <div className="ml-2 mt-0.5 text-white/80">
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      {/* Transition sans limite: on anime max-height (en px mesurés) au lieu d'une classe tailwind fixe */}
      <div
        id={contentId}
        className="overflow-hidden transition-[max-height,opacity] duration-300"
        style={{ maxHeight: open ? maxHeight : 0, opacity: open ? 1 : 0 }}
      >
        <div ref={innerRef} className="px-4 pt-1 pb-4">
          {disableContentWhileLoading ? (
            <div className="h-6 w-24 bg-white/10 rounded animate-pulse" />
          ) : (
            <div className="text-sm text-white/90 leading-relaxed space-y-2">
              <MarkdownLite
                text={section.content}
                ctx={{
                  ...ctx,
                  section: { level: Number(section.level) || 0, origin: section.origin, title: section.title },
                }}
              />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function OriginPill({ origin }: { origin: 'class' | 'subclass' }) {
  const isClass = origin === 'class';
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset',
        isClass ? 'bg-violet-500/15 text-violet-200 ring-violet-400/25' : 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
      ].join(' ')}
    >
      {isClass ? 'Classe' : 'Sous-classe'}
    </span>
  );
}

/* ===========================================================
   Ressources de classe
   =========================================================== */

function ResourceEditModal({
  label,
  total,
  onSave,
  onCancel,
}: {
  label: string;
  total: number;
  onSave: (newTotal: number) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState<string>(total.toString());
  const handleSave = () => {
    const newValue = parseInt(value) || 0;
    if (newValue >= 0) onSave(newValue);
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-1">{label}</label>
        <input
          type="number"
          min="0"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="input-dark w-full px-3 py-2 rounded-md"
        />
      </div>
      <div className="flex gap-2">
        <button onClick={handleSave} className="btn-primary flex-1 px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <Save size={16} />
          Sauvegarder
        </button>
        <button onClick={onCancel} className="btn-secondary px-4 py-2 rounded-lg flex items-center justify-center gap-2">
          <X size={16} />
          Annuler
        </button>
      </div>
    </div>
  );
}

function ResourceBlock({
  icon,
  label,
  total,
  used,
  onUse,
  onRestore,
  onUpdateTotal,
  onUpdateUsed,
  useNumericInput = false,
  color = 'purple',
  hideEdit = false,
  onGlobalPulse,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse: () => void;
  onRestore?: () => void; // rendu optionnel et sécurisé
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  hideEdit?: boolean;
  onGlobalPulse?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  // Etat pour l'effet pulse local
  const [pulse, setPulse] = useState(false);
  const triggerLocalPulse = () => {
    setPulse(true);
    window.setTimeout(() => setPulse(false), 260);
  };

  const ringColorClasses: Record<NonNullable<typeof color>, string> = {
    red: 'ring-red-400/60',
    purple: 'ring-purple-400/60',
    yellow: 'ring-yellow-400/60',
    green: 'ring-green-400/60',
    blue: 'ring-blue-400/60',
  };

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30',
  };

  return (
    <div
      className={[
        'resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3',
        'transition-shadow duration-200',
        pulse ? `ring-2 ${ringColorClasses[color]}` : '',
      ].join(' ')}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClasses[color]}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div
          className={[
            'text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center',
            'transition-transform duration-200',
            pulse ? `scale-105 ring-1 ${ringColorClasses[color]} shadow-md` : '',
          ].join(' ')}
        >
          {remaining}/{total}
        </div>
      </div>

      {useNumericInput ? (
        <div className="flex-1 flex items-center gap-1">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="input-dark flex-1 px-3 py-1 rounded-md text-center"
            placeholder="0"
          />
          <button
            onClick={(e) => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(used + value);
                setAmount('');
                triggerLocalPulse();
                onGlobalPulse?.(e);
              }
            }}
            className="p-1 text-red-500 hover:bg-red-900/30 rounded-md transition-colors"
            title="Dépenser"
          >
            <Minus size={18} />
          </button>
          <button
            onClick={() => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(Math.max(0, used - value));
                setAmount('');
              }
            }}
            className="p-1 text-green-500 hover:bg-green-900/30 rounded-md transition-colors"
            title="Récupérer"
          >
            <Plus size={18} />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={(e) => {
              const remainingNow = Math.max(0, total - used);
              if (remainingNow <= 0) return;
              onUse();
              triggerLocalPulse();
              onGlobalPulse?.(e);
            }}
            disabled={Math.max(0, total - used) <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              Math.max(0, total - used) > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Minus size={16} className="mx-auto" />
          </button>
          <button
            onClick={() => {
              if (used <= 0) return;
              onRestore?.(); // sécurisé
            }}
            disabled={used <= 0}
            className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
              used > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
            }`}
          >
            <Plus size={16} className="mx-auto" />
          </button>
        </div>
      )}


    </div>
  );
}

function mirrorMonkKeys(resource: keyof ClassResources, value: any, into: Record<string, any>) {
  const r = String(resource);
  if (r === 'credo_points') {
    into.ki_points = value;
  } else if (r === 'used_credo_points') {
    into.used_ki_points = value;
  } else if (r === 'ki_points') {
    into.credo_points = value;
  } else if (r === 'used_ki_points') {
    into.used_credo_points = value;
  }
}

function ClassResourcesCard({
  playerClass,
  resources,
  onUpdateResource,
  player,
  level,
  onPulseScreen,
}: {
  playerClass: string;
  resources?: ClassResources;
  onUpdateResource: (resource: keyof ClassResources, value: any) => void;
  player?: PlayerLike;
  level?: number;
  onPulseScreen?: (ev: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  if (!resources || !playerClass) return null;

  const cls = canonicalClass(playerClass);
  const items: React.ReactNode[] = [];

  switch (cls) {
    case 'Barbare':
      if (typeof resources.rage === 'number') {
        items.push(
          <ResourceBlock
            key="rage"
            icon={<Flame size={20} />}
            label="Rage"
            total={resources.rage}
            used={resources.used_rage || 0}
            onUse={() => onUpdateResource('used_rage', (resources.used_rage || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('rage', n)}
            onRestore={() => onUpdateResource('used_rage', Math.max(0, (resources.used_rage || 0) - 1))}
            color="red"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Barde': {
      const cap = Math.max(0, getChaModFromPlayerLike(player));
      const used = Math.min(resources.used_bardic_inspiration || 0, cap);

      items.push(
        <ResourceBlock
          key="bardic_inspiration"
          icon={<Music size={20} />}
          label="Inspiration bardique"
          total={cap}
          used={used}
          onUse={() => onUpdateResource('used_bardic_inspiration', Math.min(used + 1, cap))}
          onUpdateTotal={() => { /* no-op */ }}
          onRestore={() => onUpdateResource('used_bardic_inspiration', Math.max(0, used - 1))}
          color="purple"
          hideEdit
          onGlobalPulse={onPulseScreen}
        />
      );
      break;
    }

    case 'Clerc':
      if (typeof resources.channel_divinity === 'number') {
        items.push(
          <ResourceBlock
            key="channel_divinity"
            icon={<Cross size={20} />}
            label="Conduit divin"
            total={resources.channel_divinity}
            used={resources.used_channel_divinity || 0}
            onUse={() => onUpdateResource('used_channel_divinity', (resources.used_channel_divinity || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('channel_divinity', n)}
            onRestore={() => onUpdateResource('used_channel_divinity', Math.max(0, (resources.used_channel_divinity || 0) - 1))}
            color="yellow"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Druide':
      if (typeof resources.wild_shape === 'number') {
        items.push(
          <ResourceBlock
            key="wild_shape"
            icon={<Leaf size={20} />}
            label="Forme sauvage"
            total={resources.wild_shape}
            used={resources.used_wild_shape || 0}
            onUse={() => onUpdateResource('used_wild_shape', (resources.used_wild_shape || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('wild_shape', n)}
            onRestore={() => onUpdateResource('used_wild_shape', Math.max(0, (resources.used_wild_shape || 0) - 1))}
            color="green"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

      case 'Ensorceleur':
        // Points de sorcellerie (existant)
        if (typeof resources.sorcery_points === 'number') {
          items.push(
            <ResourceBlock
              key="sorcery_points"
              icon={<Wand2 size={20} />}
              label="Points de sorcellerie"
              total={resources.sorcery_points}
              used={resources.used_sorcery_points || 0}
              onUse={() =>
                onUpdateResource(
                  'used_sorcery_points',
                  (resources.used_sorcery_points || 0) + 1
                )
              }
              onUpdateTotal={(n) => onUpdateResource('sorcery_points', n)}
              onRestore={() =>
                onUpdateResource(
                  'used_sorcery_points',
                  Math.max(0, (resources.used_sorcery_points || 0) - 1)
                )
              }
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        // Sorcellerie innée (2 charges, reset au repos long)
        {
          const innateTotal =
            typeof resources.innate_sorcery === 'number' ? resources.innate_sorcery : 2;
          const innateUsed = Math.min(
            resources.used_innate_sorcery || 0,
            innateTotal
          );
      
          items.push(
            <ResourceBlock
              key="innate_sorcery"
              icon={<Wand2 size={20} />}
              label="Sorcellerie innée"
              total={innateTotal}
              used={innateUsed}
              onUse={() =>
                onUpdateResource(
                  'used_innate_sorcery',
                  Math.min((resources.used_innate_sorcery || 0) + 1, innateTotal)
                )
              }
              // tu peux laisser éditable le total si tu veux l’ajuster un jour
              onUpdateTotal={(n) => onUpdateResource('innate_sorcery', n)}
              onRestore={() =>
                onUpdateResource(
                  'used_innate_sorcery',
                  Math.max(0, (resources.used_innate_sorcery || 0) - 1)
                )
              }
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        break;

    case 'Guerrier':
      if (typeof resources.action_surge === 'number') {
        items.push(
          <ResourceBlock
            key="action_surge"
            icon={<Swords size={20} />}
            label="Sursaut d'action"
            total={resources.action_surge}
            used={resources.used_action_surge || 0}
            onUse={() => onUpdateResource('used_action_surge', (resources.used_action_surge || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('action_surge', n)}
            onRestore={() => onUpdateResource('used_action_surge', Math.max(0, (resources.used_action_surge || 0) - 1))}
            color="red"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Magicien':
      if (resources.arcane_recovery !== undefined) {
        items.push(
          <div
            key="arcane_recovery"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <BookOpen size={20} className="text-blue-500" />
                <span className="text-sm font-medium text-gray-300">Récupération arcanique</span>
              </div>
              <button
                onClick={() => onUpdateResource('used_arcane_recovery', !resources.used_arcane_recovery)}
                className={`h-8 px-3 flex items-center justify-center rounded-md transition-colors ${
                  resources.used_arcane_recovery ? 'bg-gray-800/50 text-gray-500' : 'text-blue-500 hover:bg-blue-900/30'
                }`}
              >
                {resources.used_arcane_recovery ? 'Utilisé' : 'Disponible'}
              </button>
            </div>
          </div>
        );
      }
      break;

      case 'Moine': {
        const total = (resources as any).credo_points ?? (resources as any).ki_points;
        const used = (resources as any).used_credo_points ?? (resources as any).used_ki_points ?? 0;
      
        if (typeof total === 'number') {
          items.push(
            <ResourceBlock
              key="credo_points"
              icon={<Sparkles size={20} />}
              label="Points de crédo"
              total={total}
              used={used}
              onUse={() => onUpdateResource('used_credo_points', used + 1)}
              onUpdateTotal={(n) => onUpdateResource('credo_points', n)}
              onRestore={() => onUpdateResource('used_credo_points', Math.max(0, used - 1))}
              color="purple"
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        // Métabolisme surnaturel (N2+): 1 charge, reset repos long (manuellement avec +)
        if ((level || 0) >= 2) {
          const metaTotal = (resources as any).supernatural_metabolism ?? 1;
          const usedMeta = Math.min((resources as any).used_supernatural_metabolism || 0, metaTotal);
      
          items.push(
            <ResourceBlock
              key="supernatural_metabolism"
              icon={<Sparkles size={20} />}
              label="Métabolisme surnaturel"
              total={metaTotal}
              used={usedMeta}
              onUse={() =>
                onUpdateResource(
                  'used_supernatural_metabolism',
                  Math.min(usedMeta + 1, metaTotal)
                )
              }
              // total fixe → pas d’édition (no-op)
              onUpdateTotal={() => { /* no-op */ }}
              onRestore={() =>
                onUpdateResource(
                  'used_supernatural_metabolism',
                  Math.max(0, usedMeta - 1)
                )
              }
              color="purple"
              hideEdit
              onGlobalPulse={onPulseScreen}
            />
          );
        }
      
        break;
      }

    case 'Occultiste': {
      // Placeholder simple: la “Magie de pacte” est signalée par un drapeau
      if ((resources as any)?.pact_magic) {
        items.push(
          <div
            key="pact_magic"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Sparkles size={20} className="text-purple-400" />
                <span className="text-sm font-medium text-gray-300">Magie de pacte</span>
              </div>
              <span className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">Repos court</span>
            </div>
          </div>
        );
      }
      break;
    }

    case 'Paladin': {
      // Total auto = 5 × niveau
      const lvl = Number(level || 0);
      const totalPoints = Math.max(0, lvl * 5);
      const used = Math.min(Math.max(0, resources.used_lay_on_hands || 0), totalPoints);

      items.push(
        <ResourceBlock
          key="lay_on_hands"
          icon={<HandHeart size={20} />}
          label="Imposition des mains"
          total={totalPoints}
          used={used}
          onUse={() => onUpdateResource('used_lay_on_hands', Math.min(used + 1, totalPoints))}
          onRestore={() => onUpdateResource('used_lay_on_hands', Math.max(0, used - 1))}
          onUpdateTotal={() => { /* no-op: total auto */ }}
          color="yellow"
          useNumericInput
          hideEdit
          onGlobalPulse={onPulseScreen}
          onUpdateUsed={(v) => {
            const clamped = Math.min(Math.max(0, v), totalPoints);
            onUpdateResource('used_lay_on_hands', clamped);
          }}
        />
      );

      // Conduits divins (N3+) — total calculé → pas d’édition
      if (lvl >= 3) {
        const cap = lvl >= 11 ? 3 : 2;
        const usedCd = resources.used_channel_divinity || 0;
        items.push(
          <ResourceBlock
            key="paladin_channel_divinity"
            icon={<Cross size={20} />}
            label="Conduits divins"
            total={cap}
            used={usedCd}
            onUse={() => onUpdateResource('used_channel_divinity', Math.min(usedCd + 1, cap))}
            onUpdateTotal={() => { /* cap calculé par niveau -> non éditable */ }}
            onRestore={() => onUpdateResource('used_channel_divinity', Math.max(0, usedCd - 1))}
            color="yellow"
            hideEdit
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;
    }

    case 'Rôdeur':
      if (typeof resources.favored_foe === 'number') {
        items.push(
          <ResourceBlock
            key="favored_foe"
            icon={<Target size={20} />}
            label="Ennemi juré"
            total={resources.favored_foe}
            used={resources.used_favored_foe || 0}
            onUse={() => onUpdateResource('used_favored_foe', (resources.used_favored_foe || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('favored_foe', n)}
            onRestore={() => onUpdateResource('used_favored_foe', Math.max(0, (resources.used_favored_foe || 0) - 1))}
            color="green"
            onGlobalPulse={onPulseScreen}
          />
        );
      }
      break;

    case 'Roublard':
      if (resources.sneak_attack) {
        items.push(
          <div
            key="sneak_attack"
            className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skull size={20} className="text-red-500" />
                <span className="text-sm font-medium text-gray-300">Attaque sournoise</span>
              </div>
              <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md">{resources.sneak_attack}</div>
            </div>
          </div>
        );
      }
      break;
  }

  if (!items.length) return null;

  return (
    <div className="stats-card">
      <div className="stat-header flex items-center gap-3">
        <Sparkles className="w-5 h-5 text-yellow-500" />
        <h3 className="text-lg font-semibold text-gray-100">Ressources de classe</h3>
      </div>
      <div className="p-4 space-y-4">{items}</div>
    </div>
  );
}

export default ClassesTab;
export { ClassesTab };

/* ===========================================================
   Helpers spécifiques – init ressources par classe
   =========================================================== */

function buildDefaultsForClass(cls: string, level: number, player?: PlayerLike | any): Partial<ClassResources> {
  switch (cls) {
    case 'Barbare':
      return { rage: Math.min(6, Math.floor((level + 3) / 4) + 2), used_rage: 0 };
    case 'Barde':
      return { used_bardic_inspiration: 0 };
    case 'Clerc':
      return { channel_divinity: level >= 6 ? 2 : 1, used_channel_divinity: 0 };
    case 'Druide':
      return { wild_shape: 2, used_wild_shape: 0 };
    case 'Ensorceleur':
      return { sorcery_points: level, used_sorcery_points: 0 };
        // Sorcellerie innée: 2 charges, reset au repos long (manuellement via +)
        base.innate_sorcery = 2;
        base.used_innate_sorcery = 0;
        return base;
      }
    case 'Guerrier':
      return { action_surge: level >= 17 ? 2 : 1, used_action_surge: 0 };
    case 'Magicien':
      return { arcane_recovery: true, used_arcane_recovery: false };

    case 'Moine': {
      const base: any = {
        credo_points: level,
        used_credo_points: 0,
        ki_points: level,
        used_ki_points: 0,
      };
      // Métabolisme surnaturel: disponible à partir du niveau 2, 1 charge
      if (level >= 2) {
        base.supernatural_metabolism = 1;
        base.used_supernatural_metabolism = 0;
      }
      return base;
    }

    case 'Occultiste':
      // Drapeau simple pour signaler Pact Magic (UI minimale)
      return { pact_magic: true };
    case 'Paladin': {
      const base: any = { lay_on_hands: level * 5, used_lay_on_hands: 0 };
      if (level >= 3) {
        base.channel_divinity = level >= 11 ? 3 : 2;
        base.used_channel_divinity = 0;
      }
      return base;
    }
    case 'Rôdeur':
      return { favored_foe: Math.max(1, Math.floor((level + 3) / 4)), used_favored_foe: 0 };
    case 'Roublard':
      return { sneak_attack: `${Math.ceil(level / 2)}d6` };
    default:
      return {};
  }
}
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
  Footprints,
  HandHeart,
  Target,
  Skull,
  BookOpen,
  Settings,
  Trash2,
  Save,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { loadAbilitySections } from '../services/classesContent';
import { loadFeatureChecks, upsertFeatureCheck } from '../services/featureChecks';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import type { ClassResources } from '../types/dnd';

/* =============================================================================
   Types et helpers
   ============================================================================= */

type AbilitySection = {
  level: number | undefined;
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
  // Les champs ci-dessous sont facultatifs, utilisés pour lire CHA
  stats?: { charisma?: number; CHA?: number } | null;
  charisma?: number;
  CHA?: number;
  ability_scores?: { cha?: number } | null;
  abilities?: any; // on laisse "any" pour couvrir array | object
};

type Props = {
  player?: PlayerLike;
  playerClass?: string;
  className?: string;
  subclassName?: string | null;
  characterLevel?: number;
  onUpdate?: (player: any) => void; // Nouveau: remonter l'état au parent
};

const DEBUG = typeof window !== 'undefined' && (window as any).UT_DEBUG === true;

const CLASS_ALIASES: Record<string, string[]> = {
  moine: ['Moine', 'Monk'],
  ensorceleur: ['Ensorceleur', 'Sorcier', 'Sorcerer'],
  barbare: ['Barbare', 'Barbarian'],
  barde: ['Barde', 'Bard'],
  clerc: ['Clerc', 'Cleric'],
  druide: ['Druide', 'Druid'],
  guerrier: ['Guerrier', 'Fighter'],
  paladin: ['Paladin'],
  rodeur: ['Rôdeur', 'Rodeur', 'Ranger'],
  voleur: ['Voleur', 'Rogue', 'Roublard'],
  magicien: ['Magicien', 'Wizard'],
};

const SUBCLASS_ALIASES: Record<string, string[]> = {
  // Moine
  'voie de la paume': [
    'Voie de la Paume',
    'Voie de la Main Ouverte',
    'Way of the Open Hand',
    'Open Hand',
    'Way Of The Open Hand',
  ],
  'voie de la main ouverte': [
    'Voie de la Main Ouverte',
    'Voie de la Paume',
    'Way of the Open Hand',
    'Open Hand',
  ],
  'credo de la paume': ['Voie de la Paume', 'Voie de la Main Ouverte', 'Way of the Open Hand'],

  // Barde — Collège du savoir
  'college du savoir': [
    'College du savoir', // sans accent, tel que le nom de fichier
    'Collège du savoir',
    'Collège du Savoir',
    'College of Lore',
    'College Of Lore',
  ],
  'collège du savoir': [
    'College du savoir',
    'Collège du savoir',
    'Collège du Savoir',
    'College of Lore',
    'College Of Lore',
  ],
};

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
  if (['clerc', 'cleric'].includes(n)) return 'Clerc';
  if (['druide', 'druid'].includes(n)) return 'Druide';
  if (['ensorceleur', 'sorcier', 'sorcerer'].includes(n)) return 'Ensorceleur';
  if (['guerrier', 'fighter'].includes(n)) return 'Guerrier';
  if (['magicien', 'wizard'].includes(n)) return 'Magicien';
  if (['moine', 'monk'].includes(n)) return 'Moine';
  if (['paladin'].includes(n)) return 'Paladin';
  if (['rodeur', 'rôdeur', 'ranger'].includes(n)) return 'Rôdeur';
  if (['roublard', 'voleur', 'rogue'].includes(n)) return 'Roublard';
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

/* ===== Helper robuste: modificateur de Charisme (array/object FR/EN + fallbacks) ===== */
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

  const fromObj = (obj: any): any | null => {
    if (!obj || typeof obj !== 'object') return null;
    const keys = Object.keys(obj);
    const key =
      keys.find(k => {
        const kk = k.toLowerCase();
        return kk === 'charisme' || kk === 'charisma' || kk === 'cha' || kk === 'car';
      }) ??
      keys.find(k => k.toLowerCase().includes('charis') || k.toLowerCase() === 'cha' || k.toLowerCase() === 'car');
    return key ? obj[key] : null;
  };

  let cha: any = null;
  const abilities = p?.abilities;

  if (Array.isArray(abilities)) {
    cha = abilities.find((a: any) => {
      const n = (a?.name || a?.abbr || a?.key || a?.code || '').toString().toLowerCase();
      return n === 'charisme' || n === 'charisma' || n === 'cha' || n === 'car';
    });
  } else if (abilities && typeof abilities === 'object') {
    cha = fromObj(abilities);
  }

  if (cha) {
    const mod = toNum(cha.modifier) ?? toNum(cha.mod) ?? toNum(cha.modValue) ?? toNum(cha.value);
    if (mod != null) return mod;
    const score = toNum(cha.score) ?? toNum(cha.total) ?? toNum(cha.base);
    if (score != null) return Math.floor((score - 10) / 2);
  }

  // Fallbacks simples si utilisés dans ton modèle
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

/* =============================================================================
   Fallback: re‑sectionnement permissif du Markdown en cas de parsing insuffisant
   ========================================================================== */

type ParsedHeading = {
  raw: string;
  label: string;
  levelNum: number | undefined;
};

function parseHeadingLabelForLevel(label: string): ParsedHeading {
  // Exemples: "Niveau 3 : Titre", "Level 14: Something"
  const m = label.match(/\b(niveau|level)\s*[:\-]?\s*(\d{1,2})\b/i);
  const levelNum = m ? Number(m[2]) : undefined;

  // Titre après ':' ou '-' si présent
  let title = label.trim();
  const split = title.split(/[:\-–—]\s*/);
  if (split.length >= 2) {
    title = split.slice(1).join(': ').trim();
  }

  return { raw: label, label: title || label.trim(), levelNum };
}

function splitMarkdownIntoSections(md: string, origin: 'class' | 'subclass'): AbilitySection[] {
  const lines = md.split(/\r?\n/);

  // Collecte des indices de titres de niveau 3+ (### ...)
  const headingIdxs: Array<{ index: number; label: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s*#{3,6}\s+(.*)$/);
    if (m) {
      const label = m[1].trim();
      headingIdxs.push({ index: i, label });
    }
  }

  // S'il n'y a pas de titres, retourner une seule section
  if (headingIdxs.length === 0) {
    const { label, levelNum } = parseHeadingLabelForLevel('');
    return [
      {
        level: levelNum,
        title: '',
        content: md.trim(),
        origin,
      },
    ];
  }

  // Construire les sections entre titres successifs
  const sections: AbilitySection[] = [];
  for (let h = 0; h < headingIdxs.length; h++) {
    const start = headingIdxs[h].index;
    const end = h + 1 < headingIdxs.length ? headingIdxs[h + 1].index : lines.length;
    const headingText = headingIdxs[h].label;

    const body = lines.slice(start + 1, end).join('\n').trim();
    const { label, levelNum } = parseHeadingLabelForLevel(headingText);

    sections.push({
      level: levelNum,
      title: label || headingText,
      content: body,
      origin,
    });
  }

  return sections;
}

function fixSectionsPermissive(
  secs: AbilitySection[],
  origin: 'class' | 'subclass'
): AbilitySection[] {
  if (!Array.isArray(secs) || secs.length === 0) return secs;

  // Heuristique: si une section contient plusieurs "###", on re‑split son contenu.
  let needFix = false;
  for (const s of secs) {
    const countHeadings = (s.content.match(/^\s*#{3,6}\s+/gm) || []).length;
    if (countHeadings >= 1) {
      needFix = true;
      break;
    }
  }

  if (!needFix && secs.length === 1) {
    const single = secs[0];
    if (/^\s*#{3,6}\s+/m.test(single.content)) {
      needFix = true;
    }
  }

  if (!needFix) return secs;

  const combined = secs.map(s => `### ${s.title}\n\n${s.content}`).join('\n\n');
  const reparsed = splitMarkdownIntoSections(combined, origin);

  if (reparsed.length >= secs.length) {
    return reparsed;
  }
  return secs;
}

/* =============================================================================
   Composant principal
   ========================================================================== */

function ClassesTab({ player, playerClass, className, subclassName, characterLevel, onUpdate }: Props) {
  const [sections, setSections] = useState<AbilitySection[]>([]);
  const [loading, setLoading] = useState(false);

  const [checkedMap, setCheckedMap] = useState<Map<string, boolean>>(new Map());
  const [loadingChecks, setLoadingChecks] = useState(false);

  const [classResources, setClassResources] = useState<ClassResources | null | undefined>(player?.class_resources);

  const rawClass = (player?.class ?? playerClass ?? className ?? '').trim();
  const rawSubclass = (player?.subclass ?? subclassName) ?? null;

  const displayClass = rawClass ? sentenceCase(rawClass) : '';
  const displaySubclass = rawSubclass ? sentenceCase(rawSubclass) : null;

  const finalLevelRaw = player?.level ?? characterLevel ?? 1;
  const finalLevel = Math.max(1, Number(finalLevelRaw) || 1);
  const characterId = player?.id ?? null;

  useEffect(() => {
    setClassResources(player?.class_resources);
  }, [player?.class_resources, player?.id]);

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
        // Propager au parent
        onUpdate?.({ ...(player || {}), class_resources: current });
      } catch (e) {
        initKeyRef.current = null;
        console.error('[ClassesTab] auto-init class_resources error:', e);
      }
    })();
  }, [player?.id, displayClass, finalLevel, classResources, player, onUpdate]);

  // Auto-cap dynamique pour Inspiration bardique (Barde):
  // total = modificateur de Charisme (>= 0), used <= total, pas de min 1 imposé
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
          bardic_inspiration: cap, // miroir en BDD, pas éditable côté UI
          used_bardic_inspiration: Math.min(used, cap),
        };

        try {
          const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
          if (error) throw error;
          setClassResources(next as ClassResources);
          bardCapRef.current = key;
          // Propager au parent
          onUpdate?.({ ...(player || {}), class_resources: next });
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
    // Dépendances qui peuvent impacter CHA
    player?.stats?.charisma,
    player?.stats?.CHA,
    player?.charisma,
    player?.CHA,
    player?.ability_scores?.cha,
    player?.abilities,
    classResources?.bardic_inspiration,
    classResources?.used_bardic_inspiration,
    onUpdate,
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

  const updateClassResource = async (
    resource: keyof ClassResources,
    value: ClassResources[keyof ClassResources]
  ) => {
    if (!player?.id) return;

    // Barde: pas d'override du total; clamp du "used"
    if (resource === 'bardic_inspiration') {
      toast.error("Le total d'Inspiration bardique est calculé automatiquement (modificateur de Charisme).");
      return;
    }

    const next: any = { ...(classResources || {}) };

    if (resource === 'used_bardic_inspiration' && typeof value === 'number') {
      const cap = Math.max(0, getChaModFromPlayerLike(player));
      next.used_bardic_inspiration = Math.min(Math.max(0, value), cap);
    } else {
      next[resource] = value;
    }

    try {
      const { error } = await supabase.from('players').update({ class_resources: next }).eq('id', player.id);
      if (error) throw error;
      setClassResources(next as ClassResources);

      // Propager au parent pour synchroniser les autres onglets
      onUpdate?.({ ...(player || {}), class_resources: next });

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
          lay_on_hands: 'Imposition des mains',
          favored_foe: 'Ennemi juré',
          sneak_attack: 'Attaque sournoise',
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
  };

  const visible = useMemo(
    () =>
      sections
        .filter((s) => (typeof s.level === 'number' ? s.level <= finalLevel : true))
        .sort((a, b) => (Number(a.level) || 0) - (Number(b.level) || 0)),
    [sections, finalLevel]
  );

  const hasClass = !!displayClass;

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-violet-700/30 via-fuchsia-600/20 to-amber-600/20 border border-white/10 rounded-2xl px-4 py-3 ring-1 ring-black/5 shadow-md shadow-black/20">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            {hasClass ? displayClass : '—'}{displaySubclass ? ` - ${displaySubclass}` : ''}
          </span>
          <span className="text-xs text-white/70">Niveau {finalLevel}</span>
        </div>
      </div>

      {hasClass && (
        <ClassResourcesCard
          playerClass={displayClass}
          resources={classResources || undefined}
          onUpdateResource={updateClassResource}
          player={player}
          level={finalLevel}
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
          {DEBUG && <pre className="mt-3 text-xs text-white/60">Activez window.UT_DEBUG = true pour voir les tentatives de chargement dans la console.</pre>}
        </div>
      ) : (
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
      )}
    </div>
  );
}

/* =============================================================================
   Chargement "smart" + correctif permissif
   ========================================================================== */

function buildDefaultsForClass(cls: string, level: number, player?: PlayerLike | any): Partial<ClassResources> {
  switch (cls) {
    case 'Barbare':
      return { rage: Math.min(6, Math.floor((level + 3) / 4) + 2), used_rage: 0 };
    case 'Barde': {
      // Pas d’override manuel; on initialise seulement le "used"
      return { used_bardic_inspiration: 0 };
    }
    case 'Clerc':
      return { channel_divinity: level >= 6 ? 2 : 1, used_channel_divinity: 0 };
    case 'Druide':
      return { wild_shape: 2, used_wild_shape: 0 };
    case 'Ensorceleur':
      return { sorcery_points: level, used_sorcery_points: 0 };
    case 'Guerrier':
      return { action_surge: level >= 17 ? 2 : 1, used_action_surge: 0 };
    case 'Magicien':
      return { arcane_recovery: true, used_arcane_recovery: false };
    case 'Moine':
      return { credo_points: level, used_credo_points: 0 };
    case 'Paladin':
      return { lay_on_hands: level * 5, used_lay_on_hands: 0 };
    case 'Rôdeur':
      return { favored_foe: Math.max(1, Math.floor((level + 3) / 4)), used_favored_foe: 0 };
    case 'Roublard':
      return { sneak_attack: `${Math.ceil(level / 2)}d6` };
    default:
      return {};
  }
}

async function loadSectionsSmart(params: { className: string; subclassName: string | null; level: number }): Promise<AbilitySection[]> {
  const { className, subclassName, level } = params;
  const clsNorm = norm(className);
  const subNorm = subclassName ? norm(subclassName) : '';

  const classCandidatesBase = uniq([className, stripDiacritics(className), stripParentheses(className), sentenceCase(className)]).filter(Boolean) as string[];
  const subclassCandidatesBase = uniq([subclassName ?? '', stripParentheses(subclassName ?? ''), stripDiacritics(subclassName ?? ''), sentenceCase(subclassName ?? '')]).filter(Boolean) as string[];

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

  // 1) Essayer toutes les combinaisons (classe x sous-classe)
  for (const c of classCandidates) {
    for (const sc of subclassCandidates) {
      try {
        if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try', { className: c, subclassName: sc, level });
        const res = await loadAbilitySections({ className: c, subclassName: sc, characterLevel: level });
        let secs = (res?.sections ?? []) as AbilitySection[];

        // Correctif permissif: si besoin, re-sectionner localement
        secs = fixSectionsPermissive(secs, 'subclass');

        if (Array.isArray(secs) && secs.length > 0) {
          if (DEBUG) console.debug('[ClassesTab] -> OK', { className: c, subclassName: sc, count: secs.length });
          return secs;
        }
      } catch (e) {
        if (DEBUG) console.debug('[ClassesTab] -> KO', { className: c, subclassName: sc, error: e });
      }
    }
  }

  // 2) Classe uniquement (sans sous-classe)
  for (const c of classCandidates) {
    try {
      if (DEBUG) console.debug('[ClassesTab] loadAbilitySections try (class only)', { className: c, level });
      const res = await loadAbilitySections({ className: c, subclassName: null, characterLevel: level });
      let secs = (res?.sections ?? []) as AbilitySection[];

      secs = fixSectionsPermissive(secs, 'class');

      if (Array.isArray(secs) && secs.length > 0) {
        if (DEBUG) console.debug('[ClassesTab] -> OK (class only)', { className: c, count: secs.length });
        return secs;
      }
    } catch (e) {
      if (DEBUG) console.debug('[ClassesTab] -> KO (class only)', { className: c, error: e });
    }
  }

  // 3) Échec
  return [];
}

/* =============================================================================
   UI: cartes et rendu Markdown léger
   ========================================================================== */

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

  return (
    <article
      className={[
        'rounded-xl border ring-1 ring-black/5 shadow-lg shadow-black/20',
        'border-amber-700/30',
        'bg-[radial-gradient(ellipse_at_top_left,rgba(120,53,15,.12),transparent_40%),radial-gradient(ellipse_at_bottom_right,rgba(91,33,182,.10),transparent_45%)]',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls={contentId}
        className="w-full text-left"
      >
        <div className="flex items-start gap-3 p-4">
          <div className="pt-0.5 shrink-0">
            <LevelBadge level={Number(section.level) || 0} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-white font-semibold text-base sm:text-lg truncate">
                {sentenceCase(section.title)}
              </h3>
              <OriginPill origin={section.origin} />
            </div>
          </div>

          <div className="ml-2 mt-0.5 text-white/80">
            {open ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
          </div>
        </div>
      </button>

      <div
        id={contentId}
        className={`overflow-hidden transition-[max-height,opacity] duration-300 ${open ? 'max-h-[200vh] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <div className="px-4 pt-1 pb-4">
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

function LevelBadge({ level }: { level: number }) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold',
        'bg-gradient-to-br from-violet-600/90 to-fuchsia-500/90 text-white',
        'ring-1 ring-inset ring-violet-300/30 shadow-sm shadow-black/20',
      ].join(' ')}
    >
      Niv. {level || '—'}
    </span>
  );
}

function OriginPill({ origin }: { origin: 'class' | 'subclass' }) {
  const isClass = origin === 'class';
  return (
    <span
      className={[
        'inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ring-1 ring-inset',
        isClass
          ? 'bg-violet-500/15 text-violet-200 ring-violet-400/25'
          : 'bg-amber-500/15 text-amber-200 ring-amber-400/25',
      ].join(' ')}
    >
      {isClass ? 'Classe' : 'Sous-classe'}
    </span>
  );
}

type MarkdownCtx = {
  characterId?: string | null;
  className: string;
  subclassName?: string | null;
  checkedMap?: Map<string, boolean>;
  onToggle?: (featureKey: string, checked: boolean) => void;
};

function MarkdownLite({ text, ctx }: { text: string; ctx: MarkdownCtx & { section: { level: number; origin: 'class' | 'subclass'; title: string } } }) {
  const nodes = useMemo(() => parseMarkdownLite(text, ctx), [text, ctx]);
  return <>{nodes}</>;
}

function parseMarkdownLite(
  md: string,
  ctx: MarkdownCtx & { section: { level: number; origin: 'class' | 'subclass'; title: string } }
): React.ReactNode[] {
  const lines = md.split(/\r?\n/);
  const out: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  const pushPara = (buff: string[]) => {
    const content = buff.join(' ').trim();
    if (!content) return;
    out.push(
      <p key={`p-${key++}`} className="text-sm">
        {formatInline(content)}
      </p>
    );
  };

  while (i < lines.length) {
    const line = lines[i];

    if (!line.trim()) {
      out.push(<div key={`sp-${key++}`} className="h-2" />);
      i++;
      continue;
    }

    // Séparateur horizontal --- (thème)
    if (/^\s*---+\s*$/.test(line)) {
      out.push(<div key={`hr-${key++}`} className="my-3 border-t border-white/10" />);
      i++;
      continue;
    }

    // ##### -> case à cocher persistante
    const h5chk = line.match(/^\s*#####\s+(.*)$/);
    if (h5chk) {
      const rawLabel = h5chk[1];
      const label = sentenceCase(rawLabel);
      const featureKey = slug(`${ctx.section.level}-${ctx.section.origin}-${ctx.section.title}--${label}`);
      const checked = ctx.checkedMap?.get(featureKey) ?? false;
      const id = `chk-${key}`;

      out.push(
        <div key={`chk-${key++}`} className="flex items-start gap-2">
          <input
            id={id}
            type="checkbox"
            checked={checked}
            onChange={(e) => ctx.onToggle?.(featureKey, e.currentTarget.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500 bg-black/40 border border-white/20 rounded"
          />
          <label htmlFor={id} className="text-sm text-white/90">
            {formatInline(label)}
          </label>
        </div>
      );
      i++;
      continue;
    }

    // #### -> petit titre (small-caps)
    const h4small = line.match(/^\s*####\s+(.*)$/);
    if (h4small) {
      out.push(
        <h5
          key={`h4s-${key++}`}
          className="text-white font-semibold text-[13px]"
          style={{ fontVariant: 'small-caps' }}
        >
          {formatInline(sentenceCase(h4small[1]))}
        </h5>
      );
      i++;
      continue;
    }

    // ### / ## / #
    const h3 = line.match(/^\s*###\s+(.*)$/i);
    if (h3) {
      out.push(
        <h4 key={`h3-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h3[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h2 = line.match(/^\s*##\s+(.*)$/i);
    if (h2) {
      out.push(
        <h4 key={`h2-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h2[1]))}
        </h4>
      );
      i++;
      continue;
    }
    const h1 = line.match(/^\s*#\s+(.*)$/i);
    if (h1) {
      out.push(
        <h4 key={`h1-${key++}`} className="text-white font-semibold text-sm sm:text-base">
          {formatInline(sentenceCase(h1[1]))}
        </h4>
      );
      i++;
      continue;
    }

    // Table Markdown simple
    if (line.includes('|')) {
      const block: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        block.push(lines[i]);
        i++;
      }
      const tableNode = renderTable(block, key);
      if (tableNode) {
        out.push(tableNode);
        key++;
        continue;
      }
      out.push(
        <p key={`pf-${key++}`} className="text-sm">
          {formatInline(block.join(' '))}
        </p>
      );
      continue;
    }

    // Liste à puces
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*[-*]\s+/, ''));
        i++;
      }
      out.push(
        <ul key={`ul-${key++}`} className="list-disc pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`li-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Liste ordonnée
    if (/^\s*\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\s*\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s*\d+\.\s+/, ''));
        i++;
      }
      out.push(
        <ol key={`ol-${key++}`} className="list-decimal pl-5 space-y-1">
          {items.map((it, idx) => (
            <li key={`oli-${idx}`} className="text-sm">
              {formatInline(it)}
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Paragraphe (agrège jusqu’à ligne de rupture)
    const buff: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^\s*[-*]\s+/.test(lines[i]) &&
      !/^\s*\d+\.\s+/.test(lines[i]) &&
      !lines[i].includes('|') &&
      !/^\s*#{1,6}\s+/.test(lines[i]) &&
      !/^\s*---+\s*$/.test(lines[i])
    ) {
      buff.push(lines[i]);
      i++;
    }
    pushPara(buff);
  }

  return out;
}

function renderTable(block: string[], key: number): React.ReactNode | null {
  if (block.length < 2) return null;
  const rows = block.map(r =>
    r
      .split('|')
      .map(c => c.trim())
      .filter((_, idx, arr) => !(idx === 0 && arr[0] === '') && !(idx === arr.length - 1 && arr[arr.length - 1] === ''))
  );

  const hasSep = rows[1] && rows[1].every(cell => /^:?-{3,}:?$/.test(cell));
  const header = hasSep ? rows[0] : null;
  const body = hasSep ? rows.slice(2) : rows;

  return (
    <div key={`tbl-${key}`} className="overflow-x-auto">
      <table className="min-w-[360px] w-full text-sm border-separate border-spacing-y-1">
        {header && (
          <thead>
            <tr>
              {header.map((h, i) => (
                <th key={`th-${i}`} className="text-left text-white font-semibold px-2 py-1 bg-white/5 rounded">
                  {formatInline(sentenceCase(h))}
                </th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {body.map((cells, r) => (
            <tr key={`tr-${r}`}>
              {cells.map((c, ci) => (
                <td key={`td-${ci}`} className="px-2 py-1 text-white/90 bg-white/0">
                  {formatInline(c)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Inline: **gras**, *italique* ou _italique_
function formatInline(text: string): React.ReactNode[] {
  let parts: Array<string | React.ReactNode> = [text];

  // Gras **...**
  parts = splitAndMap(parts, /\*\*([^*]+)\*\*/g, (m, i) => <strong key={`b-${i}`} className="text-white">{m[1]}</strong>);

  // Italique *...*
  parts = splitAndMap(parts, /(^|[^*])\*([^*]+)\*(?!\*)/g, (m, i) => [m[1], <em key={`i-${i}`} className="italic">{m[2]}</em>]);

  // Italique _..._
  parts = splitAndMap(parts, /_([^_]+)_/g, (m, i) => <em key={`u-${i}`} className="italic">{m[1]}</em>);

  return parts.map((p, i) => (typeof p === 'string' ? <React.Fragment key={`t-${i}`}>{p}</React.Fragment> : p));
}

function splitAndMap(
  parts: Array<string | React.ReactNode>,
  regex: RegExp,
  toNode: (m: RegExpExecArray, idx: number) => React.ReactNode | React.ReactNode[]
): Array<string | React.ReactNode> {
  const out: Array<string | React.ReactNode> = [];

  for (const part of parts) {
    if (typeof part !== 'string') {
      out.push(part);
      continue;
    }
    let str = part;
    let lastIndex = 0;
    let m: RegExpExecArray | null;
    const r = new RegExp(regex.source, regex.flags);

    while ((m = r.exec(str)) !== null) {
      out.push(str.slice(lastIndex, m.index));
      const node = toNode(m, out.length);
      if (Array.isArray(node)) out.push(...node);
      else out.push(node);
      lastIndex = m.index + m[0].length;
    }
    out.push(str.slice(lastIndex));
  }
  return out;
}

/* =============================================================================
   Ressources de classe
   ========================================================================== */

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
        <input type="number" min="0" value={value} onChange={(e) => setValue(e.target.value)} className="input-dark w-full px-3 py-2 rounded-md" />
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
  onDelete,
  hideEdit = false,
  minusOnly = false,
  minusSize = 18,
}: {
  icon: React.ReactNode;
  label: string;
  total: number;
  used: number;
  onUse?: () => void;
  onRestore?: () => void;
  onUpdateTotal: (newTotal: number) => void;
  onUpdateUsed?: (value: number) => void;
  useNumericInput?: boolean;
  color?: 'red' | 'purple' | 'yellow' | 'green' | 'blue';
  onDelete?: () => void;
  hideEdit?: boolean;
  minusOnly?: boolean;
  minusSize?: number;
}) {
  const remaining = Math.max(0, total - used);
  const [isEditing, setIsEditing] = useState(false);
  const [amount, setAmount] = useState<string>('');

  const colorClasses = {
    red: 'text-red-500 hover:bg-red-900/30',
    purple: 'text-purple-500 hover:bg-purple-900/30',
    yellow: 'text-yellow-500 hover:bg-yellow-900/30',
    green: 'text-green-500 hover:bg-green-900/30',
    blue: 'text-blue-500 hover:bg-blue-900/30',
  };

  return (
    <div className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className={`${colorClasses[color]}`}>{icon}</div>
          <span className="text-sm font-medium text-gray-300">{label}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="text-sm text-gray-400 bg-gray-800/50 px-3 py-1 rounded-md min-w-[64px] text-center">
            {remaining}/{total}
          </div>
          {!hideEdit && (
            <button
              onClick={() => setIsEditing(true)}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-blue-500 hover:bg-blue-900/30 rounded-full transition-colors"
              title="Modifier"
            >
              <Settings size={16} />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-red-500 hover:bg-red-900/30 rounded-full transition-colors"
              title="Supprimer"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {useNumericInput ? (
        <div className="flex-1 flex items-center gap-2">
          <input
            type="number"
            min="0"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="input-dark flex-1 px-3 py-1 rounded-md text-center"
            placeholder="0"
          />
          <button
            onClick={() => {
              const value = parseInt(amount) || 0;
              if (value > 0) {
                onUpdateUsed?.(used + value);
                setAmount('');
              }
            }}
            className="p-1 text-red-500 hover:bg-red-900/30 rounded-md transition-colors"
            title="Dépenser"
            style={{ minWidth: 44, minHeight: 44 }}
          >
            <Minus size={minusSize} />
          </button>
          {!minusOnly && (
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
          )}
        </div>
      ) : (
        <div className="flex gap-2">
          {onUse && (
            <button
              onClick={onUse}
              disabled={remaining <= 0}
              className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
                remaining > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
              }`}
            >
              <Minus size={16} className="mx-auto" />
            </button>
          )}
          {onRestore && (
            <button
              onClick={onRestore}
              disabled={used <= 0}
              className={`flex-1 h-8 flex items-center justify-center rounded-md transition-colors ${
                used > 0 ? colorClasses[color] : 'text-gray-600 bg-gray-800/50 cursor-not-allowed'
              }`}
            >
              <Plus size={16} className="mx-auto" />
            </button>
          )}
        </div>
      )}

      {isEditing && !hideEdit && (
        <div className="mt-4 border-t border-gray-700/50 pt-4">
          <ResourceEditModal
            label={`Nombre total de ${label.toLowerCase()}`}
            total={total}
            onSave={(newTotal) => {
              onRestore && onRestore();
              onUpdateTotal(newTotal);
              setIsEditing(false);
            }}
            onCancel={() => setIsEditing(false)}
          />
        </div>
      )}
    </div>
  );
}

function ClassResourcesCard({
  playerClass,
  resources,
  onUpdateResource,
  player,
  level,
}: {
  playerClass: string;
  resources?: ClassResources;
  onUpdateResource: (resource: keyof ClassResources, value: any) => void;
  player?: PlayerLike;
  level?: number;
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
          onUpdateTotal={() => { /* no-op: pas d’édition du total */ }}
          onRestore={() => onUpdateResource('used_bardic_inspiration', Math.max(0, used - 1))}
          color="purple"
          hideEdit
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
          />
        );
      }
      break;

    case 'Ensorceleur':
      if (typeof resources.sorcery_points === 'number') {
        items.push(
          <ResourceBlock
            key="sorcery_points"
            icon={<Wand2 size={20} />}
            label="Points de sorcellerie"
            total={resources.sorcery_points}
            used={resources.used_sorcery_points || 0}
            onUse={() => onUpdateResource('used_sorcery_points', (resources.used_sorcery_points || 0) + 1)}
            onUpdateTotal={(n) => onUpdateResource('sorcery_points', n)}
            onRestore={() => onUpdateResource('used_sorcery_points', Math.max(0, (resources.used_sorcery_points || 0) - 1))}
            color="purple"
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
          />
        );
      }
      break;

    case 'Magicien':
      if (resources.arcane_recovery !== undefined) {
        items.push(
          <div key="arcane_recovery" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
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
            icon={<Footprints size={20} />}
            label="Points de crédo"
            total={total}
            used={used}
            onUse={() => onUpdateResource('used_credo_points', used + 1)}
            onUpdateTotal={(n) => onUpdateResource('credo_points', n)}
            onRestore={() => onUpdateResource('used_credo_points', Math.max(0, used - 1))}
            color="blue"
          />
        );
      }
      break;
    }

    case 'Paladin':
      if (typeof resources.lay_on_hands === 'number') {
        items.push(
          <ResourceBlock
            key="lay_on_hands"
            icon={<HandHeart size={20} />}
            label="Imposition des mains"
            total={resources.lay_on_hands}
            used={resources.used_lay_on_hands || 0}
            onUpdateTotal={(n) => onUpdateResource('lay_on_hands', n)}
            onUpdateUsed={(v) => onUpdateResource('used_lay_on_hands', v)}
            color="yellow"
            useNumericInput
            hideEdit={true}
            minusOnly={true}
            minusSize={26}
          />
        );
      }
      break;

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
          />
        );
      }
      break;

    case 'Roublard':
      if (resources.sneak_attack) {
        items.push(
          <div key="sneak_attack" className="resource-block bg-gradient-to-br from-gray-800/50 to-gray-900/30 border border-gray-700/30 rounded-lg p-3">
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